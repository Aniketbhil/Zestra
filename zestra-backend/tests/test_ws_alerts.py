from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services.connection_manager import manager
from app.workers.tasks import check_low_stock

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
def setup_dependency_override(monkeypatch):
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.workers.tasks.AsyncSessionLocal", TestingSessionLocal)
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


@pytest.mark.asyncio
async def test_ws_alerts_valid_slug_and_check_low_stock():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Onboard restaurant
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alerts_ws_owner@restaurant.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Alerts Diner"},
        headers=headers,
    )
    assert onboard_resp.status_code == 201
    slug = onboard_resp.json()["slug"]

    # 2. Add low stock item & adequate stock item
    low_item = client.post(
        "/api/v1/inventory",
        json={
            "name": "Butter",
            "quantity": "1.50",
            "unit": "kg",
            "low_stock_threshold": "2.00",
        },
        headers=headers,
    ).json()

    ok_item = client.post(
        "/api/v1/inventory",
        json={
            "name": "Milk",
            "quantity": "20.00",
            "unit": "litres",
            "low_stock_threshold": "5.00",
        },
        headers=headers,
    ).json()

    # 3. Connect via WebSocket to /ws/alerts/{slug}
    with client.websocket_connect(f"/ws/alerts/{slug}") as websocket:
        assert f"alerts:{slug}" in manager.active_connections

        # Run check_low_stock task
        await check_low_stock({})

        # Receive broadcast message
        ws_msg = websocket.receive_json()
        assert ws_msg["type"] == "low_stock_alert"
        assert ws_msg["inventory_item_id"] == low_item["id"]
        assert ws_msg["name"] == "Butter"
        assert float(ws_msg["quantity"]) == 1.50

    # Verify disconnected after exiting context
    assert f"alerts:{slug}" not in manager.active_connections

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ws_alerts_invalid_slug():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    invalid_slug = "non-existent-alerts-slug"

    code = None
    try:
        with client.websocket_connect(f"/ws/alerts/{invalid_slug}"):
            pass
    except WebSocketDisconnect as exc:
        code = exc.code

    assert code == 1008
    assert f"alerts:{invalid_slug}" not in manager.active_connections

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
