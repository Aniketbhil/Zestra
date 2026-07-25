from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.restaurant import Restaurant
from app.services.restaurant import generate_base_slug

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


def test_generate_base_slug_utility():
    assert generate_base_slug("Delicious Burger & Grill!") == "delicious-burger-grill"
    assert generate_base_slug("  Pizzeria   Extra   ") == "pizzeria-extra"
    assert generate_base_slug("Café & Brasserie") == "cafe-brasserie"
    assert generate_base_slug("100% Organic Salads") == "100-organic-salads"
    assert generate_base_slug("@#$%^&*") == "restaurant"


@pytest.mark.asyncio
async def test_onboard_restaurant_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register restaurant user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    assert reg_resp.status_code == 201
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # 2. Onboard restaurant
    payload = {
        "name": "The Gourmet Bistro",
        "description": "Fine dining restaurant",
        "address": "123 Main Street, Cityville",
    }
    response = client.post(
        "/api/v1/restaurants/onboard",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "The Gourmet Bistro"
    assert data["slug"] == "the-gourmet-bistro"
    assert data["description"] == "Fine dining restaurant"
    assert data["address"] == "123 Main Street, Cityville"
    assert "id" in data
    assert "owner_id" in data

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_onboard_restaurant_unique_slug_suffix():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register and onboard first restaurant user
    r1 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner1@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens1 = r1.json()
    h1 = {"Authorization": f"Bearer {tokens1['access_token']}"}
    resp1 = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Tasty Bites"},
        headers=h1,
    )
    assert resp1.status_code == 201
    assert resp1.json()["slug"] == "tasty-bites"

    # 2. Register and onboard second restaurant user with same name
    r2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner2@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens2 = r2.json()
    h2 = {"Authorization": f"Bearer {tokens2['access_token']}"}
    resp2 = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Tasty Bites"},
        headers=h2,
    )
    assert resp2.status_code == 201
    assert resp2.json()["slug"] == "tasty-bites-1"

    # 3. Register and onboard third restaurant user with same name
    r3 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner3@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens3 = r3.json()
    h3 = {"Authorization": f"Bearer {tokens3['access_token']}"}
    resp3 = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Tasty Bites"},
        headers=h3,
    )
    assert resp3.status_code == 201
    assert resp3.json()["slug"] == "tasty-bites-2"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_onboard_restaurant_duplicate_user_rejected():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register restaurant user
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "dupeowner@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # 2. First onboard succeeds
    resp1 = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "First Restaurant"},
        headers=headers,
    )
    assert resp1.status_code == 201

    # 3. Second onboard fails for same user
    resp2 = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Second Restaurant"},
        headers=headers,
    )
    assert resp2.status_code == 400
    assert resp2.json()["detail"] == "Restaurant profile already exists for this user."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_onboard_restaurant_customer_role_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Register customer user
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "customer@user.com",
            "password": "ValidP@ssword123",
            "role": "customer",
        },
    )
    tokens = reg.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Customer Diner"},
        headers=headers,
    )
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Permission denied: insufficient privileges"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_onboard_restaurant_unauthenticated():
    resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Anon Diner"},
    )
    assert resp.status_code == 403 or resp.status_code == 401


@pytest.mark.asyncio
async def test_onboard_restaurant_invalid_input():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "invalidinput@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Empty name
    resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "   "},
        headers=headers,
    )
    assert resp.status_code == 422

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
