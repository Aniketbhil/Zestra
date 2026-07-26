from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class InventoryItemBase(BaseModel):
    name: str
    quantity: Decimal
    unit: str
    low_stock_threshold: Decimal


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    quantity: Decimal | None = None
    unit: str | None = None
    low_stock_threshold: Decimal | None = None


class InventoryItemResponse(InventoryItemBase):
    id: UUID
    restaurant_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
