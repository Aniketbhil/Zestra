import enum
from pydantic import BaseModel, EmailStr, field_validator

from app.services.security import validate_password_strength


class AllowedRegisterRole(str, enum.Enum):
    CUSTOMER = "customer"
    RESTAURANT = "restaurant"


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: AllowedRegisterRole = AllowedRegisterRole.CUSTOMER

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).lower().strip()

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).lower().strip()


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
