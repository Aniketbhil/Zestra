from decimal import Decimal
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, UniqueConstraint, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.inventory_item import InventoryItem
    from app.models.menu_item import MenuItem


class MenuItemIngredient(Base):
    __tablename__ = "menu_item_ingredients"
    __table_args__ = (
        UniqueConstraint(
            "menu_item_id",
            "inventory_item_id",
            name="uq_menu_item_inventory_item",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventory_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity_used: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    menu_item: Mapped["MenuItem"] = relationship(
        "MenuItem", back_populates="ingredients"
    )
    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem", back_populates="menu_item_ingredients"
    )
