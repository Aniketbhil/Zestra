from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
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


def helper_register_and_onboard(email: str, restaurant_name: str) -> dict:
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": restaurant_name},
        headers=headers,
    )
    restaurant = onboard_resp.json()
    return {"headers": headers, "restaurant": restaurant}


@pytest.mark.asyncio
async def test_dashboard_analytics_empty():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner_info = helper_register_and_onboard("analytics_empty@test.com", "Empty Bistro")
    headers = owner_info["headers"]

    res = client.get("/api/v1/dashboard/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert float(data["total_sales"]) == 0.00
    assert data["top_items"] == []
    assert len(data["orders_by_hour"]) == 24

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_dashboard_analytics_with_orders():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner_info = helper_register_and_onboard("analytics_owner@test.com", "Stats Diner")
    headers = owner_info["headers"]
    slug = owner_info["restaurant"]["slug"]

    # Create menu items
    item1 = client.post(
        "/api/v1/menu",
        json={"name": "Burger", "price": "10.00", "category": "Mains"},
        headers=headers,
    ).json()

    item2 = client.post(
        "/api/v1/menu",
        json={"name": "Fries", "price": "4.00", "category": "Sides"},
        headers=headers,
    ).json()

    # Place orders
    order1 = client.post(
        f"/api/v1/public/orders/{slug}",
        json={
            "items": [
                {"menu_item_id": item1["id"], "quantity": 2},
                {"menu_item_id": item2["id"], "quantity": 1},
            ]
        },
    ).json()  # Total: 10*2 + 4*1 = 24.00

    order2 = client.post(
        f"/api/v1/public/orders/{slug}",
        json={
            "items": [
                {"menu_item_id": item1["id"], "quantity": 3},
            ]
        },
    ).json()  # Total: 10*3 = 30.00

    # Fetch analytics
    res = client.get("/api/v1/dashboard/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert float(data["total_sales"]) == 54.00  # 24.00 + 30.00
    assert len(data["top_items"]) == 2
    assert data["top_items"][0]["name"] == "Burger"
    assert data["top_items"][0]["count"] == 5  # 2 + 3
    assert data["top_items"][1]["name"] == "Fries"
    assert data["top_items"][1]["count"] == 1

    # Check orders_by_hour sum equals total order count (2)
    hour_counts_sum = sum(data["orders_by_hour"].values())
    assert hour_counts_sum == 2

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_dashboard_analytics_unauthorized():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "cust_analytics@test.com",
            "password": "ValidP@ssword123",
            "role": "customer",
        },
    )
    cust_token = reg.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    res = client.get("/api/v1/dashboard/analytics", headers=cust_headers)
    assert res.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
