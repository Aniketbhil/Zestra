from decimal import Decimal
import uuid
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


def helper_register_and_onboard(email: str, restaurant_name: str) -> dict:
    """Utility helper to register a restaurant user, onboard their restaurant, and return authorization headers & restaurant info."""
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
async def test_create_menu_item_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ctx = helper_register_and_onboard("owner_create@restaurant.com", "Burger Hub")
    headers = ctx["headers"]

    payload = {
        "name": "Classic Cheeseburger",
        "description": "Juicy beef patty with cheddar cheese",
        "price": 10.99,
        "category": "Burgers",
        "image_url": "https://example.com/cheeseburger.jpg",
        "is_available": True,
    }

    response = client.post("/api/v1/menu", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Classic Cheeseburger"
    assert data["description"] == "Juicy beef patty with cheddar cheese"
    assert Decimal(str(data["price"])) == Decimal("10.99")
    assert data["category"] == "Burgers"
    assert data["image_url"] == "https://example.com/cheeseburger.jpg"
    assert data["is_available"] is True
    assert "id" in data
    assert data["restaurant_id"] == ctx["restaurant"]["id"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_list_menu_items():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    r1 = helper_register_and_onboard("owner_list1@restaurant.com", "Pizza Place")
    r2 = helper_register_and_onboard("owner_list2@restaurant.com", "Taco Stand")

    # Add items to R1
    client.post(
        "/api/v1/menu",
        json={"name": "Margherita Pizza", "price": 12.50, "category": "Pizza"},
        headers=r1["headers"],
    )
    client.post(
        "/api/v1/menu",
        json={"name": "Pepperoni Pizza", "price": 14.50, "category": "Pizza"},
        headers=r1["headers"],
    )

    # Add item to R2
    client.post(
        "/api/v1/menu",
        json={"name": "Fish Taco", "price": 4.99, "category": "Tacos"},
        headers=r2["headers"],
    )

    # R1 lists own items
    resp1 = client.get("/api/v1/menu", headers=r1["headers"])
    assert resp1.status_code == 200
    items1 = resp1.json()
    assert len(items1) == 2
    names1 = {item["name"] for item in items1}
    assert names1 == {"Margherita Pizza", "Pepperoni Pizza"}

    # R2 lists own items
    resp2 = client.get("/api/v1/menu", headers=r2["headers"])
    assert resp2.status_code == 200
    items2 = resp2.json()
    assert len(items2) == 1
    assert items2[0]["name"] == "Fish Taco"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_menu_item_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ctx = helper_register_and_onboard("owner_update@restaurant.com", "Diner 101")
    headers = ctx["headers"]

    create_resp = client.post(
        "/api/v1/menu",
        json={"name": "Old Dish", "price": 5.00, "category": "Starters"},
        headers=headers,
    )
    item_id = create_resp.json()["id"]

    update_payload = {
        "name": "Updated Dish",
        "price": 7.50,
        "is_available": False,
    }
    update_resp = client.patch(
        f"/api/v1/menu/{item_id}",
        json=update_payload,
        headers=headers,
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["name"] == "Updated Dish"
    assert Decimal(str(updated_data["price"])) == Decimal("7.50")
    assert updated_data["is_available"] is False
    assert updated_data["category"] == "Starters"  # Unchanged field

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_delete_menu_item_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ctx = helper_register_and_onboard("owner_delete@restaurant.com", "Bistro Cafe")
    headers = ctx["headers"]

    create_resp = client.post(
        "/api/v1/menu",
        json={"name": "Soup of the Day", "price": 6.00, "category": "Soups"},
        headers=headers,
    )
    item_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/api/v1/menu/{item_id}", headers=headers)
    assert delete_resp.status_code == 204

    # Verify item is gone
    list_resp = client.get("/api/v1/menu", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_cross_restaurant_update_returns_404():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    r1 = helper_register_and_onboard("owner_cross1@restaurant.com", "Resto Alpha")
    r2 = helper_register_and_onboard("owner_cross2@restaurant.com", "Resto Beta")

    # Resto Alpha creates an item
    create_resp = client.post(
        "/api/v1/menu",
        json={"name": "Alpha Special", "price": 15.00, "category": "Specials"},
        headers=r1["headers"],
    )
    alpha_item_id = create_resp.json()["id"]

    # Resto Beta tries to update Resto Alpha's item -> MUST return 404
    patch_resp = client.patch(
        f"/api/v1/menu/{alpha_item_id}",
        json={"name": "Hacked Item"},
        headers=r2["headers"],
    )
    assert patch_resp.status_code == 404
    assert patch_resp.json()["detail"] == "Menu item not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_cross_restaurant_delete_returns_404():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    r1 = helper_register_and_onboard("owner_del1@restaurant.com", "Resto Gamma")
    r2 = helper_register_and_onboard("owner_del2@restaurant.com", "Resto Delta")

    # Resto Gamma creates an item
    create_resp = client.post(
        "/api/v1/menu",
        json={"name": "Gamma Special", "price": 20.00, "category": "Specials"},
        headers=r1["headers"],
    )
    gamma_item_id = create_resp.json()["id"]

    # Resto Delta tries to delete Resto Gamma's item -> MUST return 404
    del_resp = client.delete(
        f"/api/v1/menu/{gamma_item_id}",
        headers=r2["headers"],
    )
    assert del_resp.status_code == 404
    assert del_resp.json()["detail"] == "Menu item not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_non_existent_item_returns_404():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    ctx = helper_register_and_onboard("owner_nonexist@restaurant.com", "Resto Epsilon")
    random_uuid = str(uuid.uuid4())

    patch_resp = client.patch(
        f"/api/v1/menu/{random_uuid}",
        json={"name": "Ghost Item"},
        headers=ctx["headers"],
    )
    assert patch_resp.status_code == 404

    del_resp = client.delete(
        f"/api/v1/menu/{random_uuid}",
        headers=ctx["headers"],
    )
    assert del_resp.status_code == 404

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_customer_role_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "cust@user.com",
            "password": "ValidP@ssword123",
            "role": "customer",
        },
    )
    tokens = reg.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Attempt POST
    assert client.post("/api/v1/menu", json={"name": "X", "price": 1, "category": "Y"}, headers=headers).status_code == 403
    # Attempt GET
    assert client.get("/api/v1/menu", headers=headers).status_code == 403
    # Attempt PATCH
    assert client.patch(f"/api/v1/menu/{uuid.uuid4()}", json={"name": "X"}, headers=headers).status_code == 403
    # Attempt DELETE
    assert client.delete(f"/api/v1/menu/{uuid.uuid4()}", headers=headers).status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_unonboarded_restaurant_user_returns_400():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Register restaurant role user but DO NOT onboard
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "unonboarded@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    resp = client.post(
        "/api/v1/menu",
        json={"name": "Orphan Dish", "price": 10.00, "category": "Mains"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Complete restaurant onboarding first."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

