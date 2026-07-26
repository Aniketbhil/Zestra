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
async def test_order_creation_deducts_inventory():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register & onboard restaurant owner
    owner_info = helper_register_and_onboard("burger_owner@test.com", "Burger Joint")
    headers = owner_info["headers"]
    slug = owner_info["restaurant"]["slug"]

    # 2. Create menu item
    menu_item = client.post(
        "/api/v1/menu",
        json={
            "name": "Cheeseburger",
            "price": "12.00",
            "category": "Burgers",
        },
        headers=headers,
    ).json()

    # 3. Create inventory items
    inv_beef = client.post(
        "/api/v1/inventory",
        json={
            "name": "Beef Patty",
            "quantity": "50.00",
            "unit": "pcs",
            "low_stock_threshold": "10.00",
        },
        headers=headers,
    ).json()

    inv_cheese = client.post(
        "/api/v1/inventory",
        json={
            "name": "Cheese Slices",
            "quantity": "100.00",
            "unit": "pcs",
            "low_stock_threshold": "15.00",
        },
        headers=headers,
    ).json()

    # 4. Link ingredients (1 Cheeseburger uses 1 Beef Patty and 2 Cheese Slices)
    client.post(
        f"/api/v1/menu/{menu_item['id']}/ingredients",
        json=[
            {"inventory_item_id": inv_beef["id"], "quantity_used": "1.00"},
            {"inventory_item_id": inv_cheese["id"], "quantity_used": "2.00"},
        ],
        headers=headers,
    )

    # 5. Place order for 3 Cheeseburgers
    order_payload = {
        "items": [
            {"menu_item_id": menu_item["id"], "quantity": 3}
        ]
    }
    order_res = client.post(f"/api/v1/public/orders/{slug}", json=order_payload)
    assert order_res.status_code == 201

    # 6. Verify inventory deductions (Beef: 50 - 3*1 = 47, Cheese: 100 - 3*2 = 94)
    beef_after = client.get(f"/api/v1/inventory/{inv_beef['id']}", headers=headers).json()
    cheese_after = client.get(f"/api/v1/inventory/{inv_cheese['id']}", headers=headers).json()

    assert float(beef_after["quantity"]) == 47.00
    assert float(cheese_after["quantity"]) == 94.00

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
