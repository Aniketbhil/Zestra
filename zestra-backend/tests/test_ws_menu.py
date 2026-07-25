from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services.connection_manager import manager

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
async def test_ws_menu_valid_slug():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register restaurant owner and onboard restaurant
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@wsvalid.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "WS Valid Diner"},
        headers=headers,
    )
    assert onboard_resp.status_code == 201
    slug = onboard_resp.json()["slug"]

    # 2. Connect via WebSocket
    with client.websocket_connect(f"/ws/menu/{slug}") as websocket:
        assert slug in manager.active_connections
        assert len(manager.active_connections[slug]) == 1

    # 3. On context exit (disconnect), verify socket is unregistered
    assert slug not in manager.active_connections

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ws_menu_invalid_slug():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    invalid_slug = "non-existent-ws-slug"

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/ws/menu/{invalid_slug}"):
            pass

    assert exc_info.value.code == 1008
    assert invalid_slug not in manager.active_connections

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ws_menu_availability_broadcast():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register owner & onboard restaurant
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@wsbroadcast.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Broadcast Bistro"},
        headers=headers,
    )
    assert onboard_resp.status_code == 201
    slug = onboard_resp.json()["slug"]

    # 2. Create menu item
    item_resp = client.post(
        "/api/v1/menu",
        json={
            "name": "Special Salad",
            "description": "Fresh salad",
            "price": 10.00,
            "category": "Salads",
            "is_available": True,
        },
        headers=headers,
    )
    assert item_resp.status_code == 201
    item_id = item_resp.json()["id"]

    # 3. Connect WebSocket and trigger PATCH availability update
    with client.websocket_connect(f"/ws/menu/{slug}") as websocket:
        # Patch availability
        patch_resp = client.patch(
            f"/api/v1/menu/{item_id}",
            json={"is_available": False},
            headers=headers,
        )
        assert patch_resp.status_code == 200

        # Receive broadcast message on WebSocket
        msg = websocket.receive_json()
        assert msg == {
            "type": "availability_update",
            "item_id": item_id,
            "is_available": False,
        }

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

