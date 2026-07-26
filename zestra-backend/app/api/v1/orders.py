from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_role
from app.db.session import get_db
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.schemas.order import OrderResponse, OrderStatusUpdate
from app.services.connection_manager import manager

router = APIRouter(prefix="/orders", tags=["Orders"])

VALID_TRANSITIONS: dict[OrderStatus, OrderStatus] = {
    OrderStatus.RECEIVED: OrderStatus.PREPARING,
    OrderStatus.PREPARING: OrderStatus.READY,
    OrderStatus.READY: OrderStatus.SERVED,
}


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
