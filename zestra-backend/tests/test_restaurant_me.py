from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

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
async def test_get_my_restaurant_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register restaurant user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner_me@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    assert reg_resp.status_code == 201
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # 2. Onboard restaurant
    onboard_payload = {
        "name": "My Bistro",
        "description": "My fine bistro",
        "address": "456 Oak Street",
    }
    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json=onboard_payload,
        headers=headers,
    )
    assert onboard_resp.status_code == 201

    # 3. GET /api/v1/restaurants/me
    me_resp = client.get("/api/v1/restaurants/me", headers=headers)
    assert me_resp.status_code == 200
    data = me_resp.json()
    assert data["name"] == "My Bistro"
    assert data["slug"] == "my-bistro"
    assert data["description"] == "My fine bistro"
    assert data["address"] == "456 Oak Street"
    assert "id" in data
    assert "owner_id" in data
    assert "created_at" in data

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_my_restaurant_not_onboarded():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Register restaurant user without onboarding
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new_owner@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    assert reg_resp.status_code == 201
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # GET /api/v1/restaurants/me should return 404
    me_resp = client.get("/api/v1/restaurants/me", headers=headers)
    assert me_resp.status_code == 404
    assert "not onboarded" in me_resp.json()["detail"].lower()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_my_restaurant_customer_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Register customer user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "cust@user.com",
            "password": "ValidP@ssword123",
            "role": "customer",
        },
    )
    assert reg_resp.status_code == 201
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # GET /api/v1/restaurants/me should return 403
    me_resp = client.get("/api/v1/restaurants/me", headers=headers)
    assert me_resp.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_my_restaurant_unauthenticated():
    me_resp = client.get("/api/v1/restaurants/me")
    assert me_resp.status_code in (401, 403)
