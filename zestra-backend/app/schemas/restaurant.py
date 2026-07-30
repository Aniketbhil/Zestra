from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


class RestaurantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    address: str | None = None
    image_url: str | None = None
    total_tables: int = Field(default=10, gt=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Restaurant name cannot be empty")
        return v


class RestaurantUpdate(BaseModel):
    description: str | None = None
    address: str | None = None
    contact_number: str | None = Field(None, max_length=50)
    business_hours: dict[str, str] | None = None
    image_url: str | None = None
    total_tables: int | None = Field(None, gt=0)


class RestaurantDeleteRequest(BaseModel):
    confirm: bool


class RestaurantSettingsUpdate(BaseModel):
    new_order_notifications_enabled: bool | None = None


class RestaurantResponse(BaseModel):
    id: UUID
    owner_id: UUID | None = None
    name: str
    slug: str
    description: str | None = None
    address: str | None = None
    contact_number: str | None = None
    business_hours: dict[str, str] | None = None
    total_tables: int = 10
    new_order_notifications_enabled: bool = True
    image_url: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RestaurantQRCodeResponse(BaseModel):
    qr_code_base64: str
    menu_url: str


class PublicRestaurantResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    address: str | None = None
    contact_number: str | None = None
    business_hours: dict[str, str] | None = None
    total_tables: int = 10
    image_url: str | None = None

    model_config = ConfigDict(from_attributes=True)

