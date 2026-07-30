from datetime import date as date_type
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem
from app.models.reservation import Reservation, ReservationStatus
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.dashboard import AnalyticsResponse, TopItemResponse
from app.schemas.reservation import ReservationResponse, ReservationStatusUpdateRequest
from app.services.connection_manager import manager

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


async def get_user_restaurant(db: AsyncSession, user_id: UUID) -> Restaurant:
    """Fetch the restaurant belonging to the current user, or raise 400 Bad Request if not onboarded."""
    stmt = select(Restaurant).where(
        Restaurant.owner_id == user_id,
        Restaurant.is_deleted == False,
    )
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete restaurant onboarding first.",
        )
    return restaurant


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_dashboard_analytics(
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard analytics for the authenticated restaurant user's restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    # 1. Total sales (sum of all order totals)
    stmt_sales = select(func.sum(Order.total)).where(
        Order.restaurant_id == restaurant.id
    )
    res_sales = await db.execute(stmt_sales)
    total_sales = res_sales.scalar_one_or_none() or Decimal("0.00")

    # 2. Top 5 menu items by total quantity ordered (name and count)
    stmt_top = (
        select(MenuItem.name, func.sum(OrderItem.quantity).label("count"))
        .join(OrderItem, MenuItem.id == OrderItem.menu_item_id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.restaurant_id == restaurant.id)
        .group_by(MenuItem.id, MenuItem.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    res_top = await db.execute(stmt_top)
    top_items = [
        TopItemResponse(name=name, count=int(count))
        for name, count in res_top.all()
    ]

    # 3. Orders grouped by hour-of-day (0 to 23)
    stmt_orders = select(Order.created_at).where(
        Order.restaurant_id == restaurant.id
    )
    res_orders = await db.execute(stmt_orders)
    created_ats = res_orders.scalars().all()

    orders_by_hour = {h: 0 for h in range(24)}
    for created_at in created_ats:
        orders_by_hour[created_at.hour] += 1

    return AnalyticsResponse(
        total_sales=total_sales,
        top_items=top_items,
        orders_by_hour=orders_by_hour,
    )


@router.get(
    "/reservations",
    response_model=list[ReservationResponse],
    status_code=status.HTTP_200_OK,
)
async def get_dashboard_reservations(
    date: date_type | None = Query(None, description="Optional date filter in YYYY-MM-DD format"),
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Fetch restaurant reservations for the authenticated restaurant user, optionally filtered by date."""
    restaurant = await get_user_restaurant(db, current_user.id)

    query = select(Reservation).where(Reservation.restaurant_id == restaurant.id)
    if date:
        query = query.where(Reservation.reservation_date == date)
    query = query.order_by(Reservation.reservation_date.asc(), Reservation.reservation_time.asc())

    res = await db.execute(query)
    return res.scalars().all()


@router.patch(
    "/reservations/{reservation_id}/status",
    response_model=ReservationResponse,
    status_code=status.HTTP_200_OK,
)
async def update_dashboard_reservation_status(
    reservation_id: UUID,
    payload: ReservationStatusUpdateRequest,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Update reservation status (completed or cancelled) for the authenticated restaurant user."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = select(Reservation).where(
        Reservation.id == reservation_id,
        Reservation.restaurant_id == restaurant.id,
    )
    res = await db.execute(stmt)
    reservation = res.scalar_one_or_none()

    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found.",
        )

    reservation.status = payload.status
    await db.commit()
    await db.refresh(reservation)

    if payload.status == ReservationStatus.CANCELLED:
        # Broadcast table_update (status="available") to WS /ws/tables/{slug}
        await manager.broadcast(
            f"tables:{restaurant.slug}",
            {
                "type": "table_update",
                "table_id": str(reservation.table_id),
                "date": str(reservation.reservation_date),
                "time": str(reservation.reservation_time),
                "status": "available",
            },
        )

    return reservation
