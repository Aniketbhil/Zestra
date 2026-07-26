from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MenuItemIngredientItem(BaseModel):
    inventory_item_id: UUID
    quantity_used: Decimal


class MenuItemIngredientsDefine(BaseModel):
    ingredients: list[MenuItemIngredientItem]


class MenuItemIngredientResponse(BaseModel):
    id: UUID
    menu_item_id: UUID
    inventory_item_id: UUID
    quantity_used: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
