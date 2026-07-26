from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.inventory_item import InventoryItem
from app.models.menu_item import MenuItem
from app.models.menu_item_ingredient import MenuItemIngredient
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.menu_item import MenuItemCreate, MenuItemResponse, MenuItemUpdate
from app.schemas.menu_item_ingredient import (
    MenuItemIngredientItem,
    MenuItemIngredientResponse,
    MenuItemIngredientsDefine,
)
from app.services.connection_manager import manager

router = APIRouter(prefix="/menu", tags=["Menu"])


async def get_user_restaurant(db: AsyncSession, user_id: UUID) -> Restaurant:
    """Fetch the restaurant belonging to the current user, or raise 400 Bad Request if not onboarded."""
    stmt = select(Restaurant).where(Restaurant.owner_id == user_id)
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete restaurant onboarding first.",
        )

    return restaurant


@router.post(
    "",
    response_model=MenuItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_menu_item(
    payload: MenuItemCreate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new menu item for the authenticated restaurant user's restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    item = MenuItem(
        restaurant_id=restaurant.id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        category=payload.category,
        image_url=payload.image_url,
        is_available=payload.is_available,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return item


@router.get(
    "",
    response_model=list[MenuItemResponse],
    status_code=status.HTTP_200_OK,
)
async def list_menu_items(
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """List all menu items belonging to the authenticated restaurant user's restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = (
        select(MenuItem)
        .where(MenuItem.restaurant_id == restaurant.id)
        .order_by(MenuItem.created_at.desc())
    )
    res = await db.execute(stmt)
    items = res.scalars().all()

    return items


@router.patch(
    "/{item_id}",
    response_model=MenuItemResponse,
    status_code=status.HTTP_200_OK,
)
async def update_menu_item(
    item_id: UUID,
    payload: MenuItemUpdate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Update a menu item belonging to the current restaurant. Returns 404 if item does not exist or belong to another restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = select(MenuItem).where(
        MenuItem.id == item_id,
        MenuItem.restaurant_id == restaurant.id,
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    is_available_changed = (
        "is_available" in update_data
        and update_data["is_available"] != item.is_available
    )

    for field, value in update_data.items():
        setattr(item, field, value)

    db.add(item)
    await db.commit()
    await db.refresh(item)

    if is_available_changed:
        await manager.broadcast(
            restaurant.slug,
            {
                "type": "availability_update",
                "item_id": str(item.id),
                "is_available": item.is_available,
            },
            channel="menu",
        )

    return item


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_menu_item(
    item_id: UUID,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a menu item belonging to the current restaurant. Returns 404 if item does not exist or belong to another restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = select(MenuItem).where(
        MenuItem.id == item_id,
        MenuItem.restaurant_id == restaurant.id,
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found.",
        )

    await db.delete(item)
    await db.commit()

    return None


@router.post(
    "/{item_id}/ingredients",
    response_model=list[MenuItemIngredientResponse],
    status_code=status.HTTP_200_OK,
)
async def define_menu_item_ingredients(
    item_id: UUID,
    payload: MenuItemIngredientsDefine | list[MenuItemIngredientItem],
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Define or update which inventory items a menu item consumes and how much."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt_item = select(MenuItem).where(
        MenuItem.id == item_id,
        MenuItem.restaurant_id == restaurant.id,
    )
    res_item = await db.execute(stmt_item)
    menu_item = res_item.scalar_one_or_none()

    if not menu_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found.",
        )

    ingredients_input = (
        payload if isinstance(payload, list) else payload.ingredients
    )

    if ingredients_input:
        inv_ids = list({ing.inventory_item_id for ing in ingredients_input})
        stmt_inv = select(InventoryItem).where(
            InventoryItem.id.in_(inv_ids),
            InventoryItem.restaurant_id == restaurant.id,
        )
        res_inv = await db.execute(stmt_inv)
        fetched_inv = res_inv.scalars().all()
        fetched_inv_ids = {inv.id for inv in fetched_inv}

        invalid_ids = [
            str(inv_id) for inv_id in inv_ids if inv_id not in fetched_inv_ids
        ]
        if invalid_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The following inventory items are invalid or do not belong to your restaurant: {', '.join(invalid_ids)}",
            )

    stmt_del = select(MenuItemIngredient).where(
        MenuItemIngredient.menu_item_id == item_id
    )
    res_del = await db.execute(stmt_del)
    existing_links = res_del.scalars().all()
    for link in existing_links:
        await db.delete(link)
    await db.flush()

    new_links = []

    for ing_req in ingredients_input:
        link = MenuItemIngredient(
            menu_item_id=item_id,
            inventory_item_id=ing_req.inventory_item_id,
            quantity_used=ing_req.quantity_used,
        )
        db.add(link)
        new_links.append(link)

    await db.commit()
    for link in new_links:
        await db.refresh(link)

    return new_links

