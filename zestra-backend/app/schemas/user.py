from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

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
    auth_provider: AuthProvider
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
