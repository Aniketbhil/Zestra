import uuid
from app.models.user import AuthProvider, User, UserRole


def test_user_model_instantiation():
    user = User(
        email="test@example.com",
        auth_provider=AuthProvider.LOCAL,
        role=UserRole.CUSTOMER,
    )
    assert user.email == "test@example.com"
    assert user.auth_provider == AuthProvider.LOCAL
    assert user.role == UserRole.CUSTOMER
    assert user.hashed_password is None
    assert user.google_id is None


def test_user_enums():
    assert AuthProvider.LOCAL.value == "local"
    assert AuthProvider.GOOGLE.value == "google"
    assert UserRole.CUSTOMER.value == "customer"
    assert UserRole.RESTAURANT.value == "restaurant"
    assert UserRole.ADMIN.value == "admin"
