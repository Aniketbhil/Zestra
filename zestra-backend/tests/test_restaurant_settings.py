from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.menu_item import MenuItem
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
async def test_toggle_new_order_notifications_setting():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="settings_owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Settings Bistro",
            slug="settings-bistro",
            new_order_notifications_enabled=True,
        )
        session.add(restaurant)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Verify default setting is True
    res_get = client.get("/api/v1/restaurants/me", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["new_order_notifications_enabled"] is True

    # 2. Toggle setting to False via PATCH /api/v1/restaurants/me/settings
    res_patch = client.patch(
        "/api/v1/restaurants/me/settings",
        json={"new_order_notifications_enabled": False},
        headers=headers,
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["new_order_notifications_enabled"] is False

    # 3. Verify updated setting via GET /api/v1/restaurants/me
    res_get_updated = client.get("/api/v1/restaurants/me", headers=headers)
    assert res_get_updated.status_code == 200
    assert res_get_updated.json()["new_order_notifications_enabled"] is False

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_order_broadcast_suppressed_when_notifications_disabled():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="suppress_owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Suppress Cafe",
            slug="suppress-cafe",
            new_order_notifications_enabled=False,  # Disabled
        )
        session.add(restaurant)
        await session.commit()

        item = MenuItem(
            restaurant_id=restaurant.id,
            name="Pasta",
            price=Decimal("15.00"),
            category="Mains",
            is_available=True,
        )
        session.add(item)
        await session.commit()
        item_id = item.id

    from unittest.mock import AsyncMock, patch

    with patch(
        "app.api.v1.public.manager.broadcast", new_callable=AsyncMock
    ) as mock_broadcast:
        order_payload = {
            "items": [
                {"menu_item_id": str(item_id), "quantity": 1},
            ]
        }
        res_order = client.post(
            "/api/v1/public/orders/suppress-cafe", json=order_payload
        )
        assert res_order.status_code == 201

        # Verify no broadcast was made to orders:suppress-cafe channel
        for call_args in mock_broadcast.call_args_list:
            channel = call_args[0][0]
            assert channel != "orders:suppress-cafe"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_order_broadcast_sent_when_notifications_enabled():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="notify_owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Notify Cafe",
            slug="notify-cafe",
            new_order_notifications_enabled=True,  # Enabled
        )
        session.add(restaurant)
        await session.commit()

        item = MenuItem(
            restaurant_id=restaurant.id,
            name="Pizza",
            price=Decimal("18.00"),
            category="Mains",
            is_available=True,
        )
        session.add(item)
        await session.commit()
        item_id = item.id

    with client.websocket_connect("/ws/orders/notify-cafe") as ws:
        order_payload = {
            "items": [
                {"menu_item_id": str(item_id), "quantity": 1},
            ]
        }
        res_order = client.post(
            "/api/v1/public/orders/notify-cafe", json=order_payload
        )
        assert res_order.status_code == 201

        # Receive WebSocket event
        data = ws.receive_json()
        assert data["type"] == "new_order"
        assert data["order"]["id"] == res_order.json()["id"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
