from unittest.mock import AsyncMock, MagicMock
from fastapi import WebSocket
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services.connection_manager import ConnectionManager, manager

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
async def test_connection_manager_channel_namespacing():
    cm = ConnectionManager()
    orders_ws = MagicMock(spec=WebSocket)
    orders_ws.accept = AsyncMock()
    orders_ws.send_json = AsyncMock()

    menu_ws = MagicMock(spec=WebSocket)
    menu_ws.accept = AsyncMock()
    menu_ws.send_json = AsyncMock()

    await cm.connect("bistro-x", orders_ws, channel="orders")
    await cm.connect("bistro-x", menu_ws, channel="menu")

    assert "orders:bistro-x" in cm.active_connections
    assert "menu:bistro-x" in cm.active_connections

    order_msg = {"type": "new_order", "id": "123"}
    await cm.broadcast("bistro-x", order_msg, channel="orders")

    orders_ws.send_json.assert_called_once_with(order_msg)
    menu_ws.send_json.assert_not_called()

    menu_msg = {"type": "availability_update", "item_id": "abc"}
    await cm.broadcast("bistro-x", menu_msg, channel="menu")

    menu_ws.send_json.assert_called_once_with(menu_msg)


@pytest.mark.asyncio
async def test_ws_orders_valid_slug():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Onboard restaurant
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner_orders_ws@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Order WS Diner"},
        headers=headers,
    )
    assert onboard_resp.status_code == 201
    slug = onboard_resp.json()["slug"]

    # 2. Connect via WebSocket to /ws/orders/{slug}
    with client.websocket_connect(f"/ws/orders/{slug}"):
        assert f"orders:{slug}" in manager.active_connections
        assert len(manager.active_connections[f"orders:{slug}"]) == 1

    # 3. Verify disconnected after exiting context
    assert f"orders:{slug}" not in manager.active_connections

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ws_orders_invalid_slug():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    invalid_slug = "invalid-orders-slug"

    code = None
    try:
        with client.websocket_connect(f"/ws/orders/{invalid_slug}"):
            pass
    except WebSocketDisconnect as exc:
        code = exc.code

    assert code == 1008
    assert f"orders:{invalid_slug}" not in manager.active_connections

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ws_orders_new_order_broadcast():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Setup restaurant owner & menu item
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner_broadcast_order@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Order Broadcast Cafe"},
        headers=headers,
    )
    slug = onboard_resp.json()["slug"]

    item_resp = client.post(
        "/api/v1/menu",
        json={
            "name": "Iced Coffee",
            "price": 5.00,
            "category": "Drinks",
            "is_available": True,
        },
        headers=headers,
    )
    item_id = item_resp.json()["id"]

    # Connect WebSocket to /ws/orders/{slug} and create an order
    with client.websocket_connect(f"/ws/orders/{slug}") as websocket:
        order_resp = client.post(
            f"/api/v1/public/orders/{slug}",
            json={"items": [{"menu_item_id": item_id, "quantity": 2}]},
        )
        assert order_resp.status_code == 201

        ws_msg = websocket.receive_json()
        assert ws_msg["type"] == "new_order"
        assert ws_msg["order"]["id"] == order_resp.json()["id"]
        assert float(ws_msg["order"]["total"]) == 10.00

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
