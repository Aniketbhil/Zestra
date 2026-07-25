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
async def test_get_public_menu_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register restaurant owner and onboard restaurant
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@pastapalace.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Pasta Palace"},
        headers=headers,
    )
    assert onboard_resp.status_code == 201
    slug = onboard_resp.json()["slug"]

    # 2. Add menu items in different categories
    item1 = client.post(
        "/api/v1/menu",
        json={
            "name": "Bruschetta",
            "description": "Toasted bread with tomatoes & basil",
            "price": 7.50,
            "category": "Appetizers",
            "image_url": "https://example.com/bruschetta.jpg",
            "is_available": True,
        },
        headers=headers,
    )
    assert item1.status_code == 201

    item2 = client.post(
        "/api/v1/menu",
        json={
            "name": "Spaghetti Carbonara",
            "description": "Classic Roman pasta",
            "price": 16.00,
            "category": "Mains",
            "is_available": True,
        },
        headers=headers,
    )
    assert item2.status_code == 201

    item3 = client.post(
        "/api/v1/menu",
        json={
            "name": "Tiramisu",
            "description": "Coffee-flavored Italian dessert",
            "price": 8.00,
            "category": "Desserts",
            "is_available": False,
        },
        headers=headers,
    )
    assert item3.status_code == 201

    # 3. Call public menu endpoint WITHOUT authorization header
    public_resp = client.get(f"/api/v1/public/menu/{slug}")
    assert public_resp.status_code == 200

    data = public_resp.json()
    assert data["name"] == "Pasta Palace"
    assert "categories" in data
    assert len(data["categories"]) == 3

    # Check categories structure
    categories_dict = {cat["category"]: cat["items"] for cat in data["categories"]}
    assert "Appetizers" in categories_dict
    assert "Mains" in categories_dict
    assert "Desserts" in categories_dict

    appetizers = categories_dict["Appetizers"]
    assert len(appetizers) == 1
    app_item = appetizers[0]
    assert app_item["name"] == "Bruschetta"
    assert app_item["description"] == "Toasted bread with tomatoes & basil"
    assert app_item["price"] == "7.50" or app_item["price"] == 7.50
    assert app_item["image_url"] == "https://example.com/bruschetta.jpg"
    assert app_item["is_available"] is True
    assert "id" in app_item

    # Verify sensitive fields are not exposed in items or response
    for cat in data["categories"]:
        for item in cat["items"]:
            assert "restaurant_id" not in item
            assert "owner_id" not in item
            assert "created_at" not in item

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_public_menu_empty_restaurant():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@emptybistro.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Empty Bistro"},
        headers=headers,
    )

    public_resp = client.get("/api/v1/public/menu/empty-bistro")
    assert public_resp.status_code == 200
    data = public_resp.json()
    assert data["name"] == "Empty Bistro"
    assert data["categories"] == []

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_public_menu_not_found():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    public_resp = client.get("/api/v1/public/menu/non-existent-restaurant-slug")
    assert public_resp.status_code == 404
    assert public_resp.json()["detail"] == "Restaurant not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
