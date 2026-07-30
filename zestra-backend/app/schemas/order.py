from decimal import Decimal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    menu_item_id: UUID
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderItemResponse(BaseModel):
    id: UUID
    order_id: UUID
    menu_item_id: UUID
    name: str | None = None
    quantity: int
    price_at_order: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: UUID
    restaurant_id: UUID
    customer_id: UUID | None = None
    status: OrderStatus
    total: Decimal
    created_at: datetime
    items: list[OrderItemResponse] = []

    @computed_field
    def order_id(self) -> UUID:
        return self.id

    model_config = ConfigDict(from_attributes=True)


class CustomerOrderResponse(BaseModel):
    id: UUID
    restaurant_id: UUID
    restaurant_name: str | None = None
    customer_id: UUID | None = None
    status: OrderStatus
    total: Decimal
    created_at: datetime
    items: list[OrderItemResponse] = []

    @computed_field
    def order_id(self) -> UUID:
        return self.id

    model_config = ConfigDict(from_attributes=True)
