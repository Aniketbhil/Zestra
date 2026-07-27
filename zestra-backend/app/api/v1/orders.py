from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_role
from app.db.session import get_db
from app.models.order import Order, OrderStatus
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.order import CustomerOrderResponse, OrderResponse, OrderStatusUpdate
from app.services.connection_manager import manager

router = APIRouter(prefix="/orders", tags=["Orders"])

VALID_TRANSITIONS: dict[OrderStatus, OrderStatus] = {
    OrderStatus.RECEIVED: OrderStatus.PREPARING,
    OrderStatus.PREPARING: OrderStatus.READY,
    OrderStatus.READY: OrderStatus.SERVED,
}


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


@router.get(
    "",
    response_model=list[OrderResponse],
    status_code=status.HTTP_200_OK,
)
async def list_orders(
    status_param: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
):
    """Fetch orders for the authenticated restaurant user's restaurant.

    - Requires RESTAURANT role and owner lookup.
    - Optional `?status=` query param to filter statuses (comma-separated, e.g. `?status=received,preparing`).
    - If no status param is passed, defaults to all non-served orders (status != served).
    - Returns orders with items and total, ordered by created_at descending (newest first).
    """
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = (
        select(Order)
        .where(Order.restaurant_id == restaurant.id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )

    if status_param:
        status_strings = [s.strip() for s in status_param.split(",") if s.strip()]
        valid_statuses = []
        for s in status_strings:
            try:
                valid_statuses.append(OrderStatus(s))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status filter value: '{s}'.",
                )
        stmt = stmt.where(Order.status.in_(valid_statuses))
    else:
        stmt = stmt.where(Order.status != OrderStatus.SERVED)

    res = await db.execute(stmt)
    orders = res.scalars().all()
    return orders


@router.get(
    "/me",
    response_model=list[CustomerOrderResponse],
    status_code=status.HTTP_200_OK,
)
async def get_my_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
):
    """Fetch all orders placed by the authenticated customer across all restaurants.

    - Customer role only.
    - Ordered by created_at descending (newest first).
    - Includes restaurant_name, items, total, and status.
    """
    stmt = (
        select(Order)
        .where(Order.customer_id == current_user.id)
        .options(selectinload(Order.restaurant), selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    res = await db.execute(stmt)
    orders = res.scalars().all()

    for order in orders:
        if order.restaurant:
            order.restaurant_name = order.restaurant.name

    return orders


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
)
async def get_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Fetch order details by order_id (public endpoint, no auth required).

    Returns the order's status, items, and total.
    Returns 404 if the order_id does not exist.
    """
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    return order


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
)
async def update_order_status(
    order_id: UUID,
    status_in: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
):
    """Update order status for a restaurant order.

    Requires RESTAURANT role and ownership of the restaurant.
    Enforces sequential status transition: received -> preparing -> ready -> served.
    Broadcasts status_update event over WebSocket channel orders:{slug}.
    """
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.restaurant), selectinload(Order.items))
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    # Validate restaurant ownership
    if order.restaurant.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You do not own this order's restaurant.",
        )

    # Validate status transition
    expected_next_status = VALID_TRANSITIONS.get(order.status)
    if status_in.status != expected_next_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{order.status.value}' to '{status_in.status.value}'.",
        )

    # Update DB
    order.status = status_in.status
    await db.commit()

    # Re-fetch order with items loaded for response
    stmt_order = (
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items))
    )
    res_order = await db.execute(stmt_order)
    updated_order = res_order.scalar_one()

    status_update_msg = {
        "type": "status_update",
        "order_id": str(updated_order.id),
        "status": updated_order.status.value,
    }

    # Broadcast WebSocket updates:
    # 1. Restaurant dashboard channel (orders:{slug})
    await manager.broadcast(
        f"orders:{order.restaurant.slug}",
        status_update_msg,
    )
    # 2. Customer tracking channel (order:{order_id})
    await manager.broadcast(
        f"order:{updated_order.id}",
        status_update_msg,
    )

    return updated_order
