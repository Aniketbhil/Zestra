from decimal import Decimal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


class MenuItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=100)
    image_url: str | None = Field(None, max_length=500)
    is_available: bool = True

    @field_validator("name", "category")
    @classmethod
    def validate_non_empty_str(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty or blank space")
        return v


class MenuItemUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(None, gt=0)
    category: str | None = Field(None, min_length=1, max_length=100)
    image_url: str | None = Field(None, max_length=500)
    is_available: bool | None = None

    @field_validator("name", "category")
    @classmethod
    def validate_non_empty_str(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty or blank space")
        return v


class MenuItemResponse(BaseModel):
    id: UUID
    restaurant_id: UUID
    name: str
    description: str | None = None
    price: Decimal
    category: str
    image_url: str | None = None
    is_available: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
