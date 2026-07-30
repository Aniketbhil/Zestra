from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.order import Order, OrderStatus, PaymentStatus
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


@pytest.mark.asyncio
async def test_order_payment_fields_default_and_custom():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="order_pay_owner@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Pay Bistro",
            slug="pay-bistro",
        )
        session.add(restaurant)
        await session.commit()

        # 1. Order with default payment status
        order1 = Order(
            restaurant_id=restaurant.id,
            status=OrderStatus.RECEIVED,
            total=Decimal("250.00"),
        )
        # 2. Order with custom payment fields
        order2 = Order(
            restaurant_id=restaurant.id,
            status=OrderStatus.RECEIVED,
            payment_status=PaymentStatus.PAID,
            razorpay_order_id="order_12345",
            razorpay_payment_id="pay_67890",
            total=Decimal("500.00"),
        )
        session.add_all([order1, order2])
        await session.commit()
        await session.refresh(order1)
        await session.refresh(order2)

        assert order1.payment_status == PaymentStatus.PENDING
        assert order1.razorpay_order_id is None
        assert order1.razorpay_payment_id is None

        assert order2.payment_status == PaymentStatus.PAID
        assert order2.razorpay_order_id == "order_12345"
        assert order2.razorpay_payment_id == "pay_67890"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
