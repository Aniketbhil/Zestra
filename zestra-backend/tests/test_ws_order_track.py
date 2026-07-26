from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
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
from app.services.connection_manager import manager
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
async def test_ws_order_track_initial_status():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_track@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Track Diner",
            slug="track-diner",
        )
        session.add(restaurant)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            customer_id=None,
            status=OrderStatus.RECEIVED,
            total=Decimal("12.50"),
        )
        session.add(order)
        await session.commit()

        order_id = order.id

    with client.websocket_connect(f"/ws/orders/track/{order_id}") as websocket:
        assert f"order:{order_id}" in manager.active_connections

        # Initial status sent on connection
        initial_msg = websocket.receive_json()
        assert initial_msg == {
            "type": "order_status",
            "order_id": str(order_id),
            "status": "received",
        }

    assert f"order:{order_id}" not in manager.active_connections

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ws_order_track_dual_broadcast_on_status_change():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_dual@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Dual Diner",
            slug="dual-diner",
        )
        session.add(restaurant)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            customer_id=None,
            status=OrderStatus.RECEIVED,
            total=Decimal("25.00"),
        )
        session.add(order)
        await session.commit()

        owner_id = owner.id
        order_id = order.id
        slug = restaurant.slug

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Open staff websocket and customer tracking websocket concurrently
    with client.websocket_connect(f"/ws/orders/{slug}") as staff_ws:
        with client.websocket_connect(f"/ws/orders/track/{order_id}") as customer_ws:
            # Customer receives initial status message on connection
            init_msg = customer_ws.receive_json()
            assert init_msg["type"] == "order_status"

            # Restaurant owner updates status: received -> preparing
            patch_resp = client.patch(
                f"/api/v1/orders/{order_id}/status",
                json={"status": "preparing"},
                headers=headers,
            )
            assert patch_resp.status_code == 200

            # Staff WS receives status_update
            staff_msg = staff_ws.receive_json()
            assert staff_msg == {
                "type": "status_update",
                "order_id": str(order_id),
                "status": "preparing",
            }

            # Customer tracking WS receives status_update
            customer_msg = customer_ws.receive_json()
            assert customer_msg == {
                "type": "status_update",
                "order_id": str(order_id),
                "status": "preparing",
            }

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ws_order_track_invalid_order_id():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    invalid_id = uuid.uuid4()

    code = None
    try:
        with client.websocket_connect(f"/ws/orders/track/{invalid_id}"):
            pass
    except WebSocketDisconnect as exc:
        code = exc.code

    assert code == 1008
    assert f"order:{invalid_id}" not in manager.active_connections

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
