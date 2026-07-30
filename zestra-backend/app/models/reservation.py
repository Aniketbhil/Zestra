from datetime import date, datetime, time, timezone
import enum
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import (
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Time,
    UUID,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.restaurant import Restaurant
    from app.models.table import Table
    from app.models.user import User


class ReservationStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    table_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tables.id"),
        nullable=False,
        index=True,
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    reservation_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    reservation_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )
    status: Mapped[ReservationStatus] = mapped_column(
        SQLEnum(
            ReservationStatus,
            name="reservation_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=ReservationStatus.CONFIRMED,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    table: Mapped["Table"] = relationship("Table")
    restaurant: Mapped["Restaurant"] = relationship("Restaurant")
    customer: Mapped["User"] = relationship("User")

    __table_args__ = (
        Index(
            "uq_table_date_time_confirmed",
            "table_id",
            "reservation_date",
            "reservation_time",
            unique=True,
            postgresql_where=text("status = 'confirmed'"),
            sqlite_where=text("status = 'confirmed'"),
        ),
    )
