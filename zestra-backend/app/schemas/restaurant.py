from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


class RestaurantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    address: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Restaurant name cannot be empty")
        return v


class RestaurantResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    slug: str
    description: str | None = None
    address: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
