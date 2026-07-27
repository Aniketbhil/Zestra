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
async def test_get_my_orders_customer_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_me@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        customer = User(
            email="cust_me@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add_all([owner, customer])
        await session.commit()

        rest1 = Restaurant(
            owner_id=owner.id,
            name="Pizza Spot",
            slug="pizza-spot",
        )
        session.add(rest1)
        await session.commit()

        item1 = MenuItem(
            restaurant_id=rest1.id,
            name="Margherita",
            price=Decimal("15.00"),
            category="Pizzas",
            is_available=True,
        )
        session.add(item1)
        await session.commit()

        # Create 2 orders placed by customer
        order1 = Order(
            restaurant_id=rest1.id,
            customer_id=customer.id,
            status=OrderStatus.PREPARING,
            total=Decimal("15.00"),
        )
        order2 = Order(
            restaurant_id=rest1.id,
            customer_id=customer.id,
            status=OrderStatus.READY,
            total=Decimal("30.00"),
        )
        session.add_all([order1, order2])
        await session.commit()

        session.add_all([
            OrderItem(order_id=order1.id, menu_item_id=item1.id, quantity=1, price_at_order=Decimal("15.00")),
            OrderItem(order_id=order2.id, menu_item_id=item1.id, quantity=2, price_at_order=Decimal("15.00")),
        ])
        await session.commit()

        customer_id = customer.id

    token = create_access_token({"sub": str(customer_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/orders/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    # Verify fields
    for order_data in data:
        assert order_data["restaurant_name"] == "Pizza Spot"
        assert order_data["customer_id"] == str(customer_id)
        assert len(order_data["items"]) > 0

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_my_orders_empty_and_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        customer = User(
            email="empty_cust@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        owner = User(
            email="owner_forbidden@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add_all([customer, owner])
        await session.commit()
        customer_id = customer.id
        owner_id = owner.id

    # 1. Customer with no orders -> empty list
    cust_token = create_access_token({"sub": str(customer_id)})
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    res_empty = client.get("/api/v1/orders/me", headers=cust_headers)
    assert res_empty.status_code == 200
    assert res_empty.json() == []

    # 2. Restaurant role user -> 403 Forbidden
    owner_token = create_access_token({"sub": str(owner_id)})
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    res_forbidden = client.get("/api/v1/orders/me", headers=owner_headers)
    assert res_forbidden.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
