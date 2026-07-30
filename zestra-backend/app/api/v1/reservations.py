import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.restaurant import Restaurant
from app.models.table import Table
from app.models.user import User, UserRole
from app.schemas.reservation import ReservationCreateRequest, ReservationResponse
from app.services.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.post(
    "",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reservation(
    payload: ReservationCreateRequest,
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: AsyncSession = Depends(get_db),
):
    """Create a table reservation (customer role only).

    Attempts to create the reservation directly relying on the database unique constraint
    to prevent double bookings. Returns HTTP 409 Conflict if slot is already booked.
    """
    # 1. Validate restaurant exists by slug
    stmt = select(Restaurant).where(Restaurant.slug == payload.slug)
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found.",
        )

    # 2. Validate table exists and belongs to this restaurant
    table_stmt = select(Table).where(
        Table.id == payload.table_id,
        Table.restaurant_id == restaurant.id,
    )
    table_res = await db.execute(table_stmt)
    table = table_res.scalar_one_or_none()

    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found for this restaurant.",
        )

    if table.capacity is not None and payload.party_size > table.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This table can only seat {table.capacity} guests, but {payload.party_size} were requested",
        )

    # 3. Instantiate Reservation
    reservation = Reservation(
        table_id=table.id,
        restaurant_id=restaurant.id,
        customer_id=current_user.id,
        reservation_date=payload.reservation_date,
        reservation_time=payload.reservation_time,
        party_size=payload.party_size,
        status=ReservationStatus.CONFIRMED,
    )
    db.add(reservation)

    # 4. Attempt insert & catch unique constraint IntegrityError
    try:
        await db.commit()
        await db.refresh(reservation)
    except IntegrityError as e:
        await db.rollback()
        logger.info(f"Reservation conflict for table {table.id} at {payload.reservation_date} {payload.reservation_time}: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This table is already booked for the selected time",
        )

    # 5. Broadcast table_update (status="booked") to WS /ws/tables/{slug}
    await manager.broadcast(
        f"tables:{restaurant.slug}",
        {
            "type": "table_update",
            "table_id": str(reservation.table_id),
            "date": str(reservation.reservation_date),
            "time": str(reservation.reservation_time),
            "status": "booked",
        },
    )

    return reservation


@router.get(
    "/me",
    response_model=list[ReservationResponse],
    status_code=status.HTTP_200_OK,
)
async def get_my_reservations(
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: AsyncSession = Depends(get_db),
):
    """Fetch all reservations created by the authenticated customer."""
    stmt = (
        select(Reservation)
        .where(Reservation.customer_id == current_user.id)
        .order_by(Reservation.reservation_date.desc(), Reservation.reservation_time.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.patch(
    "/{reservation_id}/cancel",
    response_model=ReservationResponse,
    status_code=status.HTTP_200_OK,
)
async def cancel_reservation(
    reservation_id: UUID,
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a reservation owned by the customer and free up the slot."""
    stmt = (
        select(Reservation)
        .where(Reservation.id == reservation_id)
        .options(joinedload(Reservation.restaurant))
    )
    res = await db.execute(stmt)
    reservation = res.scalar_one_or_none()

    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found.",
        )

    if reservation.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: user does not own this reservation.",
        )

    reservation.status = ReservationStatus.CANCELLED
    await db.commit()
    await db.refresh(reservation)

    # Broadcast table_update (status="available") to WS /ws/tables/{slug}
    await manager.broadcast(
        f"tables:{reservation.restaurant.slug}",
        {
            "type": "table_update",
            "table_id": str(reservation.table_id),
            "date": str(reservation.reservation_date),
            "time": str(reservation.reservation_time),
            "status": "available",
        },
    )

    return reservation
