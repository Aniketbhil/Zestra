from decimal import Decimal
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.order import Order, OrderStatus
from app.models.restaurant import Restaurant
from app.models.user import AuthProvider, User, UserRole

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
async def test_create_razorpay_order_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_pay@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Razorpay Diner",
            slug="razorpay-diner",
        )
        session.add(restaurant)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            status=OrderStatus.RECEIVED,
            total=Decimal("250.50"),
        )
        session.add(order)
        await session.commit()
        await session.refresh(order)
        order_id = str(order.id)

    mock_client = MagicMock()
    mock_client.order.create.return_value = {"id": "order_rzp_mock_12345"}

    with patch("app.api.v1.payments.get_razorpay_client", return_value=mock_client):
        response = client.post(
            "/api/v1/payments/create-order",
            json={"order_id": order_id},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["razorpay_order_id"] == "order_rzp_mock_12345"
        assert data["amount"] == 25050  # 250.50 * 100
        assert data["currency"] == "INR"

        mock_client.order.create.assert_called_once_with(
            {
                "amount": 25050,
                "currency": "INR",
                "receipt": order_id,
            }
        )

    # Verify order.razorpay_order_id stored in DB
    async with TestingSessionLocal() as session:
        res = await session.execute(
            Base.metadata.tables["orders"].select().where(
                Base.metadata.tables["orders"].c.id == order_id
            )
        )
        updated_order = res.fetchone()
        assert updated_order.razorpay_order_id == "order_rzp_mock_12345"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_create_razorpay_order_not_found():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    response = client.post(
        "/api/v1/payments/create-order",
        json={"order_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Order not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_verify_razorpay_payment_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_verify@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Verify Diner",
            slug="verify-diner",
        )
        session.add(restaurant)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            status=OrderStatus.RECEIVED,
            razorpay_order_id="order_verify_123",
            total=Decimal("300.00"),
        )
        session.add(order)
        await session.commit()
        order_id = str(order.id)

    mock_client = MagicMock()
    mock_client.utility.verify_payment_signature.return_value = True

    payload = {
        "razorpay_order_id": "order_verify_123",
        "razorpay_payment_id": "pay_verify_456",
        "razorpay_signature": "valid_signature_hash",
    }

    with patch("app.api.v1.payments.get_razorpay_client", return_value=mock_client):
        response = client.post("/api/v1/payments/verify", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Payment verification successful."
        assert data["order_id"] == order_id
        assert data["payment_status"] == "paid"

        mock_client.utility.verify_payment_signature.assert_called_once_with(
            {
                "razorpay_order_id": "order_verify_123",
                "razorpay_payment_id": "pay_verify_456",
                "razorpay_signature": "valid_signature_hash",
            }
        )

    # Verify DB update
    async with TestingSessionLocal() as session:
        res = await session.execute(
            Base.metadata.tables["orders"].select().where(
                Base.metadata.tables["orders"].c.id == order_id
            )
        )
        updated_order = res.fetchone()
        assert updated_order.payment_status == "paid"
        assert updated_order.razorpay_payment_id == "pay_verify_456"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_verify_razorpay_payment_invalid_signature():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_bad_sig@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Bad Sig Diner",
            slug="badsig-diner",
        )
        session.add(restaurant)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            status=OrderStatus.RECEIVED,
            razorpay_order_id="order_badsig_123",
            total=Decimal("150.00"),
        )
        session.add(order)
        await session.commit()
        order_id = str(order.id)

    mock_client = MagicMock()
    mock_client.utility.verify_payment_signature.side_effect = Exception("Signature mismatch")

    payload = {
        "razorpay_order_id": "order_badsig_123",
        "razorpay_payment_id": "pay_badsig_456",
        "razorpay_signature": "invalid_signature",
    }

    with patch("app.api.v1.payments.get_razorpay_client", return_value=mock_client):
        response = client.post("/api/v1/payments/verify", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid payment signature."

    # Verify DB order payment_status remains pending
    async with TestingSessionLocal() as session:
        res = await session.execute(
            Base.metadata.tables["orders"].select().where(
                Base.metadata.tables["orders"].c.id == order_id
            )
        )
        unchanged_order = res.fetchone()
        assert unchanged_order.payment_status == "pending"
        assert unchanged_order.razorpay_payment_id is None

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_razorpay_webhook_payment_captured_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_webhook@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Webhook Diner",
            slug="webhook-diner",
        )
        session.add(restaurant)
        await session.commit()

        order = Order(
            restaurant_id=restaurant.id,
            status=OrderStatus.RECEIVED,
            razorpay_order_id="order_webhook_123",
            total=Decimal("400.00"),
        )
        session.add(order)
        await session.commit()
        order_id = str(order.id)

    mock_client = MagicMock()
    mock_client.utility.verify_webhook_signature.return_value = True

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook_789",
                    "order_id": "order_webhook_123",
                    "status": "captured",
                }
            }
        },
    }

    headers = {"X-Razorpay-Signature": "valid_webhook_sig"}

    with patch("app.api.v1.payments.get_razorpay_client", return_value=mock_client):
        response = client.post(
            "/api/v1/payments/webhook",
            json=webhook_payload,
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    # Verify DB update
    async with TestingSessionLocal() as session:
        res = await session.execute(
            Base.metadata.tables["orders"].select().where(
                Base.metadata.tables["orders"].c.id == order_id
            )
        )
        updated_order = res.fetchone()
        assert updated_order.payment_status == "paid"
        assert updated_order.razorpay_payment_id == "pay_webhook_789"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_razorpay_webhook_double_processing_guard():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_double@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Double Diner",
            slug="double-diner",
        )
        session.add(restaurant)
        await session.commit()

        # Order already paid via /verify
        order = Order(
            restaurant_id=restaurant.id,
            status=OrderStatus.RECEIVED,
            payment_status="paid",
            razorpay_order_id="order_double_123",
            razorpay_payment_id="pay_double_456",
            total=Decimal("400.00"),
        )
        session.add(order)
        await session.commit()

    mock_client = MagicMock()
    mock_client.utility.verify_webhook_signature.return_value = True

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_double_456",
                    "order_id": "order_double_123",
                    "status": "captured",
                }
            }
        },
    }

    headers = {"X-Razorpay-Signature": "valid_webhook_sig"}

    with patch("app.api.v1.payments.get_razorpay_client", return_value=mock_client):
        response = client.post(
            "/api/v1/payments/webhook",
            json=webhook_payload,
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.json()["message"] == "Order already processed"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_razorpay_webhook_invalid_signature():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    mock_client = MagicMock()
    mock_client.utility.verify_webhook_signature.side_effect = Exception("Webhook signature mismatch")

    headers = {"X-Razorpay-Signature": "bad_sig"}

    with patch("app.api.v1.payments.get_razorpay_client", return_value=mock_client):
        response = client.post(
            "/api/v1/payments/webhook",
            json={"event": "payment.captured"},
            headers=headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid webhook signature."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
