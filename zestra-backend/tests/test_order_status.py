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
async def test_order_status_valid_transitions_and_ws_broadcast():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_status@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Status Diner",
            slug="status-diner",
        )
        session.add(restaurant)
        await session.commit()

        item = MenuItem(
            restaurant_id=restaurant.id,
            name="Burger",
            price=Decimal("10.00"),
            category="Mains",
            is_available=True,
        )
        session.add(item)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            customer_id=None,
            status=OrderStatus.RECEIVED,
            total=Decimal("10.00"),
        )
        session.add(order)
        await session.commit()

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item.id,
            quantity=1,
            price_at_order=Decimal("10.00"),
        )
        session.add(order_item)
        await session.commit()

        owner_id = owner.id
        order_id = order.id
        slug = restaurant.slug

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Connect WebSocket to /ws/orders/{slug}
    with client.websocket_connect(f"/ws/orders/{slug}") as websocket:
        # 1. RECEIVED -> PREPARING
        res1 = client.patch(
            f"/api/v1/orders/{order_id}/status",
            json={"status": "preparing"},
            headers=headers,
        )
        assert res1.status_code == 200
        assert res1.json()["status"] == "preparing"

        ws_msg1 = websocket.receive_json()
        assert ws_msg1 == {
            "type": "status_update",
            "order_id": str(order_id),
            "status": "preparing",
        }

        # 2. PREPARING -> READY
        res2 = client.patch(
            f"/api/v1/orders/{order_id}/status",
            json={"status": "ready"},
            headers=headers,
        )
        assert res2.status_code == 200
        assert res2.json()["status"] == "ready"

        ws_msg2 = websocket.receive_json()
        assert ws_msg2 == {
            "type": "status_update",
            "order_id": str(order_id),
            "status": "ready",
        }

        # 3. READY -> SERVED
        res3 = client.patch(
            f"/api/v1/orders/{order_id}/status",
            json={"status": "served"},
            headers=headers,
        )
        assert res3.status_code == 200
        assert res3.json()["status"] == "served"

        ws_msg3 = websocket.receive_json()
        assert ws_msg3 == {
            "type": "status_update",
            "order_id": str(order_id),
            "status": "served",
        }

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_order_status_invalid_transitions():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_invalid_trans@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Transition Cafe",
            slug="transition-cafe",
        )
        session.add(restaurant)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            customer_id=None,
            status=OrderStatus.RECEIVED,
            total=Decimal("15.00"),
        )
        session.add(order)
        await session.commit()

        owner_id = owner.id
        order_id = order.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt illegal transition: received -> ready (skipping preparing)
    res_skip = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "ready"},
        headers=headers,
    )
    assert res_skip.status_code == 400
    assert "Invalid status transition" in res_skip.json()["detail"]

    # Attempt illegal transition: received -> served (skipping preparing & ready)
    res_skip2 = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "served"},
        headers=headers,
    )
    assert res_skip2.status_code == 400

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_order_status_unauthorized_and_ownership():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner1 = User(
            email="owner1_status@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        owner2 = User(
            email="owner2_status@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        customer = User(
            email="cust_status@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add_all([owner1, owner2, customer])
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner1.id,
            name="Owner1 Diner",
            slug="owner1-diner",
        )
        session.add(restaurant)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            status=OrderStatus.RECEIVED,
            total=Decimal("20.00"),
        )
        session.add(order)
        await session.commit()

        owner2_id = owner2.id
        customer_id = customer.id
        order_id = order.id

    token_cust = create_access_token({"sub": str(customer_id)})
    token_owner2 = create_access_token({"sub": str(owner2_id)})

    # Customer role attempted status update -> 403 Forbidden
    res_cust = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "preparing"},
        headers={"Authorization": f"Bearer {token_cust}"},
    )
    assert res_cust.status_code == 403

    # Other restaurant owner attempted status update -> 403 Forbidden
    res_owner2 = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "preparing"},
        headers={"Authorization": f"Bearer {token_owner2}"},
    )
    assert res_owner2.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_order_status_nonexistent_order():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_404@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.patch(
        f"/api/v1/orders/{uuid.uuid4()}/status",
        json={"status": "preparing"},
        headers=headers,
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Order not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
