import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.restaurant import Restaurant
from app.models.user import AuthProvider, User, UserRole
from app.services.security import create_access_token

TEST_SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


@pytest.fixture(autouse=True)
def setup_dependency_override():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


@pytest.mark.asyncio
async def test_get_profile_customer():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        customer = User(
            email="cust_profile@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(customer)
        await session.commit()
        customer_id = customer.id

    token = create_access_token({"sub": str(customer_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/users/me/profile", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "cust_profile@example.com"
    assert data["role"] == "customer"
    assert data["auth_provider"] == "local"
    assert data["full_name"] is None
    assert data["restaurant"] is None

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_profile_restaurant_with_nested_restaurant():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_profile@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Profile Cafe",
            slug="profile-cafe",
        )
        session.add(restaurant)
        await session.commit()
        owner_id = owner.id
        restaurant_id = str(restaurant.id)

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/users/me/profile", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "owner_profile@restaurant.com"
    assert data["role"] == "restaurant"
    assert data["restaurant"] is not None
    assert data["restaurant"]["id"] == restaurant_id
    assert data["restaurant"]["name"] == "Profile Cafe"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_patch_profile_update_full_name():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(
            email="update_profile@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        user_id = user.id

    token = create_access_token({"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Update full_name
    patch_res = client.patch(
        "/api/v1/users/me/profile",
        json={"full_name": "Alice Smith"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["full_name"] == "Alice Smith"
    assert patch_data["email"] == "update_profile@example.com"

    # Verify via GET
    get_res = client.get("/api/v1/users/me/profile", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["full_name"] == "Alice Smith"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_profile_unauthorized():
    res_get = client.get("/api/v1/users/me/profile")
    assert res_get.status_code == 401

    res_patch = client.patch(
        "/api/v1/users/me/profile", json={"full_name": "Test"}
    )
    assert res_patch.status_code == 401
