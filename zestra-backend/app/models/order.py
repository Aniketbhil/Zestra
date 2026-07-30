from decimal import Decimal
import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Integer, Numeric, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.menu_item import MenuItem
    from app.models.restaurant import Restaurant
    from app.models.user import User


class OrderStatus(str, enum.Enum):
    RECEIVED = "received"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(
            OrderStatus,
            name="order_status_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=OrderStatus.RECEIVED,
        nullable=False,
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    restaurant: Mapped["Restaurant"] = relationship(
        "Restaurant", back_populates="orders"
    )
    customer: Mapped["User | None"] = relationship(
        "User", back_populates="orders"
    )
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id"),
        nullable=False,
        index=True,
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("menu_items.id"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    price_at_order: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    menu_item: Mapped["MenuItem"] = relationship("MenuItem")

    @property
    def name(self) -> str | None:
        return self.menu_item.name if self.menu_item else None

