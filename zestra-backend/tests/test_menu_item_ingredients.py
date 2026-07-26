from decimal import Decimal
import uuid
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
    """Helper to register a restaurant user and onboard their restaurant."""
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
async def test_define_and_update_menu_item_ingredients():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user_info = helper_register_and_onboard("pizza_owner@test.com", "Pizza Kitchen")
    headers = user_info["headers"]

    # 1. Create a menu item
    menu_res = client.post(
        "/api/v1/menu",
        json={
            "name": "Margherita Pizza",
            "price": "14.00",
            "category": "Pizzas",
        },
        headers=headers,
    )
    assert menu_res.status_code == 201
    menu_item_id = menu_res.json()["id"]

    # 2. Create inventory items
    inv1_res = client.post(
        "/api/v1/inventory",
        json={
            "name": "Cheese",
            "quantity": "50.00",
            "unit": "kg",
            "low_stock_threshold": "5.00",
        },
        headers=headers,
    )
    inv2_res = client.post(
        "/api/v1/inventory",
        json={
            "name": "Tomato Sauce",
            "quantity": "20.00",
            "unit": "litres",
            "low_stock_threshold": "2.00",
        },
        headers=headers,
    )
    inv1_id = inv1_res.json()["id"]
    inv2_id = inv2_res.json()["id"]

    # 3. Define ingredients for menu item
    ingredients_payload = [
        {"inventory_item_id": inv1_id, "quantity_used": "0.20"},
        {"inventory_item_id": inv2_id, "quantity_used": "0.10"},
    ]
    def_res = client.post(
        f"/api/v1/menu/{menu_item_id}/ingredients",
        json=ingredients_payload,
        headers=headers,
    )
    assert def_res.status_code == 200
    data = def_res.json()
    assert len(data) == 2
    assert data[0]["menu_item_id"] == menu_item_id
    assert float(data[0]["quantity_used"]) in [0.20, 0.10]

    # 4. Update ingredients (override)
    updated_payload = [
        {"inventory_item_id": inv1_id, "quantity_used": "0.30"},
    ]
    update_res = client.post(
        f"/api/v1/menu/{menu_item_id}/ingredients",
        json=updated_payload,
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert len(updated_data) == 1
    assert updated_data[0]["inventory_item_id"] == inv1_id
    assert float(updated_data[0]["quantity_used"]) == 0.30

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_define_ingredients_mismatch_and_invalid():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner1 = helper_register_and_onboard("owner1_ing@test.com", "Diner 1")
    owner2 = helper_register_and_onboard("owner2_ing@test.com", "Diner 2")

    # Owner 1 creates menu item and inventory item
    menu1 = client.post(
        "/api/v1/menu",
        json={"name": "Burger", "price": "10.00", "category": "Mains"},
        headers=owner1["headers"],
    ).json()
    inv1 = client.post(
        "/api/v1/inventory",
        json={"name": "Beef", "quantity": "10.00", "unit": "kg", "low_stock_threshold": "1.00"},
        headers=owner1["headers"],
    ).json()

    # Owner 2 creates inventory item
    inv2 = client.post(
        "/api/v1/inventory",
        json={"name": "Buns", "quantity": "50.00", "unit": "pcs", "low_stock_threshold": "5.00"},
        headers=owner2["headers"],
    ).json()

    # Owner 2 tries to set ingredients for Owner 1's menu item -> 404
    res_404 = client.post(
        f"/api/v1/menu/{menu1['id']}/ingredients",
        json=[{"inventory_item_id": inv2["id"], "quantity_used": "1.00"}],
        headers=owner2["headers"],
    )
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Menu item not found."

    # Owner 1 tries to use Owner 2's inventory item for Owner 1's menu item -> 400
    res_400 = client.post(
        f"/api/v1/menu/{menu1['id']}/ingredients",
        json=[{"inventory_item_id": inv2["id"], "quantity_used": "1.00"}],
        headers=owner1["headers"],
    )
    assert res_400.status_code == 400
    assert "invalid or do not belong to your restaurant" in res_400.json()["detail"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
