from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem, OrderStatus
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


@pytest.mark.asyncio
async def test_order_and_order_item_creation():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Create restaurant owner & customer
        owner = User(
            email="owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        customer = User(
            email="customer@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add_all([owner, customer])
        await session.commit()
        await session.refresh(owner)
        await session.refresh(customer)

        # Create restaurant & menu item
        restaurant = Restaurant(
            owner_id=owner.id,
            name="Tasty Diner",
            slug="tasty-diner",
            description="Good food",
        )
        session.add(restaurant)
        await session.commit()
        await session.refresh(restaurant)

        menu_item = MenuItem(
            restaurant_id=restaurant.id,
            name="Pizza Margherita",
            price=Decimal("15.50"),
            category="Main",
        )
        session.add(menu_item)
        await session.commit()
        await session.refresh(menu_item)

        # Create Order with customer
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            status=OrderStatus.RECEIVED,
            total=Decimal("31.00"),
        )
        session.add(order)
        await session.commit()
        await session.refresh(order)

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            quantity=2,
            price_at_order=Decimal("15.50"),
        )
        session.add(order_item)
        await session.commit()
        await session.refresh(order_item)

        assert order.id is not None
        assert order.restaurant_id == restaurant.id
        assert order.customer_id == customer.id
        assert order.status == OrderStatus.RECEIVED
        assert order.total == Decimal("31.00")
        assert order.created_at is not None

        assert order_item.id is not None
        assert order_item.order_id == order.id
        assert order_item.menu_item_id == menu_item.id
        assert order_item.quantity == 2
        assert order_item.price_at_order == Decimal("15.50")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_guest_order_creation():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner2@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()
        await session.refresh(owner)

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Guest Cafe",
            slug="guest-cafe",
        )
        session.add(restaurant)
        await session.commit()
        await session.refresh(restaurant)

        # Guest order (customer_id is None)
        guest_order = Order(
            restaurant_id=restaurant.id,
            customer_id=None,
            status=OrderStatus.RECEIVED,
            total=Decimal("9.99"),
        )
        session.add(guest_order)
        await session.commit()
        await session.refresh(guest_order)

        assert guest_order.id is not None
        assert guest_order.customer_id is None
        assert guest_order.status == OrderStatus.RECEIVED

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
