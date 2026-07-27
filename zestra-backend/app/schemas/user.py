from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import AuthProvider, UserRole
from app.services.security import validate_password_strength


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    auth_provider: AuthProvider
    role: UserRole
    is_active: bool
    notifications_enabled: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=255)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                return None
        return v


class UserSettingsUpdate(BaseModel):
    notifications_enabled: bool | None = None


from app.schemas.restaurant import RestaurantResponse


class UserProfileResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    auth_provider: AuthProvider
    is_active: bool
    notifications_enabled: bool = True
    created_at: datetime
    restaurant: RestaurantResponse | None = None

    model_config = ConfigDict(from_attributes=True)

