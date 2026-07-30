import enum
from pydantic import BaseModel, EmailStr, field_validator

import re

from app.services.security import validate_password_strength

E164_PHONE_REGEX = re.compile(r"^\+[1-9]\d{1,14}$")


class AllowedRegisterRole(str, enum.Enum):
    CUSTOMER = "customer"
    RESTAURANT = "restaurant"


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    phone_number: str | None = None
    role: AllowedRegisterRole = AllowedRegisterRole.CUSTOMER

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).lower().strip()

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                return None
            if not E164_PHONE_REGEX.match(v):
                raise ValueError("Invalid phone number format. Must be in E.164 format (e.g. +919876543210).")
        return v



class UserRegisterResponse(BaseModel):
    message: str
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).lower().strip()

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("OTP cannot be empty.")
        return v


class ResendOTPRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> str:
        return str(v).lower().strip()


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


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_new_password(cls, v: str) -> str:
        return validate_password_strength(v)
