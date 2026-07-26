from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem, OrderStatus
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
async def test_ai_insights_success_and_caching():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="insights_owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Insights Bistro",
            slug="insights-bistro",
        )
        session.add(restaurant)
        await session.commit()

        item = MenuItem(
            restaurant_id=restaurant.id,
            name="Special Pasta",
            price=Decimal("20.00"),
            category="Mains",
            is_available=True,
        )
        session.add(item)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            status=OrderStatus.SERVED,
            total=Decimal("40.00"),
        )
        session.add(order)
        await session.commit()

        session.add(
            OrderItem(
                order_id=order.id,
                menu_item_id=item.id,
                quantity=2,
                price_at_order=Decimal("20.00"),
            )
        )
        await session.commit()
        owner_id = owner.id
        restaurant_id = str(restaurant.id)

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Mock Redis client get and set to test caching
    fake_redis_store = {}

    async def mock_redis_get(key):
        return fake_redis_store.get(key)

    async def mock_redis_set(key, val, ex=None):
        fake_redis_store[key] = val

    with patch("app.api.v1.ai.redis_client.get", side_effect=mock_redis_get), \
         patch("app.api.v1.ai.redis_client.set", side_effect=mock_redis_set):

        # First call (cache miss)
        res1 = client.get("/api/v1/ai/insights", headers=headers)
        assert res1.status_code == 200
        data1 = res1.json()
        assert "summary" in data1
        assert len(data1["summary"]) > 0

        # Verify key was stored in Redis
        cache_key = f"ai:insights:{restaurant_id}"
        assert cache_key in fake_redis_store

        # Second call (cache hit)
        res2 = client.get("/api/v1/ai/insights", headers=headers)
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["summary"] == data1["summary"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ai_insights_gemini_api_mock():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="gemini_owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Gemini Cafe",
            slug="gemini-cafe",
        )
        session.add(restaurant)
        await session.commit()

        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    mock_gemini_response = MagicMock()
    mock_gemini_response.text = "Operational summary: Strong sales during lunch peak. Focus on inventory prep."

    with patch("app.api.v1.ai.settings.GEMINI_API_KEY", "mock-api-key"), \
         patch("google.genai.Client") as mock_client_cls, \
         patch("app.api.v1.ai.redis_client.get", side_effect=lambda k: None), \
         patch("app.api.v1.ai.redis_client.set", side_effect=lambda k, v, ex=None: None):

        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_gemini_response
        mock_client_cls.return_value = mock_instance

        res = client.get("/api/v1/ai/insights", headers=headers)
        assert res.status_code == 200
        assert res.json()["summary"] == "Operational summary: Strong sales during lunch peak. Focus on inventory prep."
        mock_instance.models.generate_content.assert_called_once()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ai_insights_customer_role_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        customer = User(
            email="insights_customer@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(customer)
        await session.commit()
        customer_id = customer.id

    token = create_access_token({"sub": str(customer_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/ai/insights", headers=headers)
    assert res.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ai_insights_refresh_query_param():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="refresh_owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Refresh Diner",
            slug="refresh-diner",
        )
        session.add(restaurant)
        await session.commit()
        owner_id = owner.id
        restaurant_id = str(restaurant.id)

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    cache_key = f"ai:insights:{restaurant_id}"
    fake_redis_store = {cache_key: "Old cached summary"}

    async def mock_redis_get(key):
        return fake_redis_store.get(key)

    async def mock_redis_set(key, val, ex=None):
        fake_redis_store[key] = val

    with patch("app.api.v1.ai.redis_client.get", side_effect=mock_redis_get) as mock_get, \
         patch("app.api.v1.ai.redis_client.set", side_effect=mock_redis_set):

        res = client.get("/api/v1/ai/insights?refresh=true", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["summary"] != "Old cached summary"
        mock_get.assert_not_called()
        assert fake_redis_store[cache_key] == data["summary"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
