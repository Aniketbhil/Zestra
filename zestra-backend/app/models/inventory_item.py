from decimal import Decimal
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.menu_item_ingredient import MenuItemIngredient
    from app.models.restaurant import Restaurant


class InventoryItem(Base):
    __tablename__ = "inventory_items"

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
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    unit: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    low_stock_threshold: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    restaurant: Mapped["Restaurant"] = relationship(
        "Restaurant", back_populates="inventory_items"
    )
    menu_item_ingredients: Mapped[list["MenuItemIngredient"]] = relationship(
        "MenuItemIngredient", back_populates="inventory_item", cascade="all, delete-orphan"
    )

