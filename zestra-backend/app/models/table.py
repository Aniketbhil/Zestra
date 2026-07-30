import uuid
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, Integer, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.restaurant import Restaurant


class Table(Base):
    __tablename__ = "tables"

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
    table_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    capacity: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        default=4,
    )

    restaurant: Mapped["Restaurant"] = relationship(
        "Restaurant", back_populates="tables"
    )
