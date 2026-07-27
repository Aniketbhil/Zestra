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
async def test_update_restaurant_me_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="update_rest_owner@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Original Gourmet",
            slug="original-gourmet",
            description="Old description",
            address="Old address",
        )
        session.add(restaurant)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "description": "Updated gourmet description",
        "address": "789 Fine Dining Ave",
        "contact_number": "+1-555-0144",
        "business_hours": {
            "mon": "10:00-22:00",
            "tue": "10:00-22:00",
            "wed": "10:00-22:00",
        },
    }

    res = client.patch(
        "/api/v1/restaurants/me", json=update_payload, headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Original Gourmet"  # Name locked
    assert data["slug"] == "original-gourmet"  # Slug locked
    assert data["description"] == "Updated gourmet description"
    assert data["address"] == "789 Fine Dining Ave"
    assert data["contact_number"] == "+1-555-0144"
    assert data["business_hours"] == {
        "mon": "10:00-22:00",
        "tue": "10:00-22:00",
        "wed": "10:00-22:00",
    }

    # Verify via GET /api/v1/restaurants/me
    get_res = client.get("/api/v1/restaurants/me", headers=headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["contact_number"] == "+1-555-0144"
    assert get_data["business_hours"] == update_payload["business_hours"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_restaurant_me_not_onboarded():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="not_onboarded_patch@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.patch(
        "/api/v1/restaurants/me",
        json={"description": "New description"},
        headers=headers,
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Restaurant not onboarded yet."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_restaurant_me_customer_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        customer = User(
            email="cust_patch@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(customer)
        await session.commit()
        customer_id = customer.id

    token = create_access_token({"sub": str(customer_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.patch(
        "/api/v1/restaurants/me",
        json={"description": "New description"},
        headers=headers,
    )
    assert res.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
