from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_optional_current_user
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem, OrderStatus
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.menu_item import (
    PublicMenuCategoryResponse,
    PublicMenuItemResponse,
    PublicMenuResponse,
)
from app.schemas.order import OrderCreate, OrderItemCreate, OrderResponse
from app.services.connection_manager import manager

router = APIRouter(prefix="/public", tags=["Public"])


@router.get(
    "/menu/{slug}",
    response_model=PublicMenuResponse,
    status_code=status.HTTP_200_OK,
)
async def get_public_menu(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch public restaurant menu by restaurant slug without authentication."""
    stmt = select(Restaurant).where(Restaurant.slug == slug)
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found.",
        )

    items_stmt = (
        select(MenuItem)
        .where(MenuItem.restaurant_id == restaurant.id)
        .order_by(MenuItem.category.asc(), MenuItem.created_at.asc())
    )
    items_res = await db.execute(items_stmt)
    menu_items = items_res.scalars().all()

    grouped_categories: dict[str, list[PublicMenuItemResponse]] = {}
    for item in menu_items:
        cat = item.category
        if cat not in grouped_categories:
            grouped_categories[cat] = []
        grouped_categories[cat].append(PublicMenuItemResponse.model_validate(item))

    categories_list = [
        PublicMenuCategoryResponse(category=cat, items=items)
        for cat, items in grouped_categories.items()
    ]

    return PublicMenuResponse(
        name=restaurant.name,
        categories=categories_list,
    )


@router.post(
    "/orders/{slug}",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_public_order(
    slug: str,
    order_in: OrderCreate | list[OrderItemCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Create a public order for a restaurant slug.

    Supports guest orders (no auth) and logged-in customer orders (optional auth header).
    Calculates prices and order total server-side based on DB menu item prices.
    Rejects with 400 if any menu item does not belong to the restaurant or is unavailable.
    """
    items_input = order_in if isinstance(order_in, list) else order_in.items

    if not items_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item.",
        )

    # 1. Validate restaurant exists
    stmt = select(Restaurant).where(Restaurant.slug == slug)
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found.",
        )

    # 2. Fetch requested menu items
    menu_item_ids = list({item.menu_item_id for item in items_input})
    items_stmt = select(MenuItem).where(MenuItem.id.in_(menu_item_ids))
    items_res = await db.execute(items_stmt)
    fetched_items = items_res.scalars().all()
    db_items_map = {item.id: item for item in fetched_items}

    # 3. Validate items belong to restaurant and are available
    unavailable_item_ids = []
    for item_req in items_input:
        menu_item = db_items_map.get(item_req.menu_item_id)
        if (
            not menu_item
            or menu_item.restaurant_id != restaurant.id
            or not menu_item.is_available
        ):
            unavailable_item_ids.append(str(item_req.menu_item_id))

    if unavailable_item_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The following menu items are unavailable or invalid: {', '.join(set(unavailable_item_ids))}",
        )

    # 4. Calculate prices and total server-side
    order_total = Decimal("0.00")
    order_items_data = []

    for item_req in items_input:
        menu_item = db_items_map[item_req.menu_item_id]
        price_at_order = menu_item.price
        line_total = price_at_order * item_req.quantity
        order_total += line_total

        order_items_data.append(
            {
                "menu_item_id": menu_item.id,
                "quantity": item_req.quantity,
                "price_at_order": price_at_order,
            }
        )

    # 5. Set customer_id (null for guests, logged-in user id if authenticated)
    customer_id = current_user.id if current_user else None

    # 6. Create Order & OrderItems
    order = Order(
        restaurant_id=restaurant.id,
        customer_id=customer_id,
        status=OrderStatus.RECEIVED,
        total=order_total,
    )
    db.add(order)
    await db.flush()

    for item_data in order_items_data:
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item_data["menu_item_id"],
            quantity=item_data["quantity"],
            price_at_order=item_data["price_at_order"],
        )
        db.add(order_item)

    await db.commit()

    # Load order items for response
    stmt_order = (
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items))
    )
    res_order = await db.execute(stmt_order)
    created_order = res_order.scalar_one()

    await manager.broadcast(
        f"orders:{restaurant.slug}",
        {
            "type": "new_order",
            "order": OrderResponse.model_validate(created_order).model_dump(
                mode="json"
            ),
        },
    )

    return created_order
