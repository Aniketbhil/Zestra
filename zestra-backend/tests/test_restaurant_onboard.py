from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.restaurant import Restaurant
from app.models.table import Table
from app.models.user import AuthProvider, User, UserRole
from app.services.restaurant import generate_base_slug
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


async def create_test_user(email: str, role: UserRole) -> tuple[User, dict[str, str]]:
    async with TestingSessionLocal() as session:
        user = User(
            email=email,
            auth_provider=AuthProvider.LOCAL,
            role=role,
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        token = create_access_token({"sub": str(user.id)})
        headers = {"Authorization": f"Bearer {token}"}
        return user, headers


def test_generate_base_slug_utility():
    assert generate_base_slug("Delicious Burger & Grill!") == "delicious-burger-grill"
    assert generate_base_slug("  Pizzeria   Extra   ") == "pizzeria-extra"
    assert generate_base_slug("Café & Brasserie") == "cafe-brasserie"
    assert generate_base_slug("100% Organic Salads") == "100-organic-salads"
    assert generate_base_slug("@#$%^&*") == "restaurant"


@pytest.mark.asyncio
async def test_onboard_restaurant_success_and_tables_created():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user, headers = await create_test_user("owner@restaurant.com", UserRole.RESTAURANT)

    payload = {
        "name": "The Gourmet Bistro",
        "description": "Fine dining restaurant",
        "address": "123 Main Street, Cityville",
        "total_tables": 5,
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
    assert data["total_tables"] == 5
    assert "id" in data
    assert "owner_id" in data

    # Verify tables 1..5 created in database
    async with TestingSessionLocal() as session:
        res = await session.execute(
            Base.metadata.tables["tables"].select().where(
                Base.metadata.tables["tables"].c.restaurant_id == data["id"]
            )
        )
        table_rows = res.fetchall()
        assert len(table_rows) == 5
        table_numbers = sorted([row.table_number for row in table_rows])
        assert table_numbers == [1, 2, 3, 4, 5]
        for row in table_rows:
            assert row.capacity == 4

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_onboard_restaurant_unique_slug_suffix():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    u1, h1 = await create_test_user("owner1@restaurant.com", UserRole.RESTAURANT)
    resp1 = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Tasty Bites"},
        headers=h1,
    )
    assert resp1.status_code == 201
    assert resp1.json()["slug"] == "tasty-bites"

    u2, h2 = await create_test_user("owner2@restaurant.com", UserRole.RESTAURANT)
    resp2 = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Tasty Bites"},
        headers=h2,
    )
    assert resp2.status_code == 201
    assert resp2.json()["slug"] == "tasty-bites-1"

    u3, h3 = await create_test_user("owner3@restaurant.com", UserRole.RESTAURANT)
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

    user, headers = await create_test_user("dupeowner@restaurant.com", UserRole.RESTAURANT)

    resp1 = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "First Restaurant"},
        headers=headers,
    )
    assert resp1.status_code == 201

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

    user, headers = await create_test_user("customer@user.com", UserRole.CUSTOMER)

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

    user, headers = await create_test_user("invalidinput@restaurant.com", UserRole.RESTAURANT)

    resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "   "},
        headers=headers,
    )
    assert resp.status_code == 422

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
