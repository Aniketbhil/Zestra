import pytest
from pydantic import ValidationError
from app.schemas.user import UserCreate
from app.services.security import (
    hash_password,
    validate_password_strength,
    verify_password,
)


def test_argon2_hashing():
    password = "StrongPassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_password_strength_validator():
    # Valid password
    assert validate_password_strength("ValidP@ss1") == "ValidP@ss1"

    # Too short (<8 chars)
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_strength("P@ss1")

    # Missing uppercase
    with pytest.raises(ValueError, match="uppercase"):
        validate_password_strength("validp@ss1")

    # Missing lowercase
    with pytest.raises(ValueError, match="lowercase"):
        validate_password_strength("VALIDP@SS1")

    # Missing special character
    with pytest.raises(ValueError, match="special character"):
        validate_password_strength("ValidPass123")


def test_user_create_schema_validation():
    # Valid model
    user_data = UserCreate(email="user@example.com", password="SecretP@ssword1")
    assert user_data.email == "user@example.com"

    # Invalid email
    with pytest.raises(ValidationError):
        UserCreate(email="not-an-email", password="SecretP@ssword1")

    # Invalid password
    with pytest.raises(ValidationError):
        UserCreate(email="user@example.com", password="weakpassword")
