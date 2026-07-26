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
async def test_create_and_read_inventory_item():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user_info = helper_register_and_onboard("inv_owner@test.com", "Bistro 101")
    headers = user_info["headers"]

    payload = {
        "name": "Tomatoes",
        "quantity": "25.50",
        "unit": "kg",
        "low_stock_threshold": "5.00",
    }
    res = client.post("/api/v1/inventory", json=payload, headers=headers)
    assert res.status_code == 201
    item = res.json()
    assert item["name"] == "Tomatoes"
    assert float(item["quantity"]) == 25.50
    assert item["unit"] == "kg"
    assert float(item["low_stock_threshold"]) == 5.00
    assert "id" in item
    assert "restaurant_id" in item

    item_id = item["id"]

    # List items
    res_list = client.get("/api/v1/inventory", headers=headers)
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) == 1
    assert items[0]["id"] == item_id

    # Get single item
    res_get = client.get(f"/api/v1/inventory/{item_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == item_id

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_inventory_item():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user_info = helper_register_and_onboard("inv_update@test.com", "Flavors")
    headers = user_info["headers"]

    payload = {
        "name": "Olive Oil",
        "quantity": "10.00",
        "unit": "litres",
        "low_stock_threshold": "2.00",
    }
    create_res = client.post("/api/v1/inventory", json=payload, headers=headers)
    item_id = create_res.json()["id"]

    # PATCH update
    patch_res = client.patch(
        f"/api/v1/inventory/{item_id}",
        json={"quantity": "4.50"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert float(patch_res.json()["quantity"]) == 4.50
    assert patch_res.json()["name"] == "Olive Oil"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_delete_inventory_item():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user_info = helper_register_and_onboard("inv_del@test.com", "Grill House")
    headers = user_info["headers"]

    payload = {
        "name": "Cheese",
        "quantity": "15.00",
        "unit": "kg",
        "low_stock_threshold": "3.00",
    }
    create_res = client.post("/api/v1/inventory", json=payload, headers=headers)
    item_id = create_res.json()["id"]

    # Delete item
    del_res = client.delete(f"/api/v1/inventory/{item_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify deleted (404)
    get_res = client.get(f"/api/v1/inventory/{item_id}", headers=headers)
    assert get_res.status_code == 404
    assert get_res.json()["detail"] == "Inventory item not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_owner_mismatch_returns_404():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner1 = helper_register_and_onboard("owner1_inv@test.com", "Resto 1")
    owner2 = helper_register_and_onboard("owner2_inv@test.com", "Resto 2")

    # Owner 1 creates item
    payload = {
        "name": "Flour",
        "quantity": "50.00",
        "unit": "kg",
        "low_stock_threshold": "10.00",
    }
    create_res = client.post("/api/v1/inventory", json=payload, headers=owner1["headers"])
    item_id = create_res.json()["id"]

    # Owner 2 tries to access Owner 1's item -> 404
    get_res = client.get(f"/api/v1/inventory/{item_id}", headers=owner2["headers"])
    assert get_res.status_code == 404
    assert get_res.json()["detail"] == "Inventory item not found."

    patch_res = client.patch(
        f"/api/v1/inventory/{item_id}",
        json={"quantity": "0.00"},
        headers=owner2["headers"],
    )
    assert patch_res.status_code == 404
    assert patch_res.json()["detail"] == "Inventory item not found."

    del_res = client.delete(f"/api/v1/inventory/{item_id}", headers=owner2["headers"])
    assert del_res.status_code == 404
    assert del_res.json()["detail"] == "Inventory item not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_customer_role_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Register customer
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "cust_inv@test.com",
            "password": "ValidP@ssword123",
            "role": "customer",
        },
    )
    token = reg.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/inventory", headers=cust_headers)
    assert res.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
