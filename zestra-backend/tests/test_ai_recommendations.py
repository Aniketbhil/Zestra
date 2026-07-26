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
async def test_ai_recommendations_history_category_based():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="ai_owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        customer = User(
            email="ai_customer@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add_all([owner, customer])
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="AI Bistro",
            slug="ai-bistro",
        )
        session.add(restaurant)
        await session.commit()

        item1 = MenuItem(
            restaurant_id=restaurant.id,
            name="Cheeseburger",
            price=Decimal("10.00"),
            category="Burgers",
            is_available=True,
        )
        item2 = MenuItem(
            restaurant_id=restaurant.id,
            name="Bacon Burger",
            price=Decimal("12.00"),
            category="Burgers",
            is_available=True,
        )
        item3 = MenuItem(
            restaurant_id=restaurant.id,
            name="Veggie Burger",
            price=Decimal("11.00"),
            category="Burgers",
            is_available=True,
        )
        item4 = MenuItem(
            restaurant_id=restaurant.id,
            name="Fries",
            price=Decimal("4.00"),
            category="Sides",
            is_available=True,
        )
        session.add_all([item1, item2, item3, item4])
        await session.commit()

        # Customer orders Cheeseburger (category: Burgers)
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            status=OrderStatus.SERVED,
            total=Decimal("10.00"),
        )
        session.add(order)
        await session.commit()

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item1.id,
            quantity=1,
            price_at_order=Decimal("10.00"),
        )
        session.add(order_item)
        await session.commit()

        customer_id = customer.id

    token = create_access_token({"sub": str(customer_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/ai/recommendations?slug=ai-bistro", headers=headers)
    assert res.status_code == 200
    data = res.json()
    item_names = [item["name"] for item in data]

    # Should include un-ordered items in "Burgers" category
    assert "Bacon Burger" in item_names
    assert "Veggie Burger" in item_names
    # Should NOT include already ordered item "Cheeseburger"
    assert "Cheeseburger" not in item_names

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ai_recommendations_fallback_top_items():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="ai_owner2@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        other_customer = User(
            email="other_cust@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        new_customer = User(
            email="new_cust@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add_all([owner, other_customer, new_customer])
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Top Seller Cafe",
            slug="top-seller-cafe",
        )
        session.add(restaurant)
        await session.commit()

        item1 = MenuItem(
            restaurant_id=restaurant.id,
            name="Popular Coffee",
            price=Decimal("5.00"),
            category="Drinks",
            is_available=True,
        )
        item2 = MenuItem(
            restaurant_id=restaurant.id,
            name="Croissant",
            price=Decimal("4.00"),
            category="Bakery",
            is_available=True,
        )
        session.add_all([item1, item2])
        await session.commit()

        # Other customer orders 10 Popular Coffee and 2 Croissants
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=other_customer.id,
            status=OrderStatus.SERVED,
            total=Decimal("58.00"),
        )
        session.add(order)
        await session.commit()

        session.add_all([
            OrderItem(order_id=order.id, menu_item_id=item1.id, quantity=10, price_at_order=Decimal("5.00")),
            OrderItem(order_id=order.id, menu_item_id=item2.id, quantity=2, price_at_order=Decimal("4.00")),
        ])
        await session.commit()

        new_customer_id = new_customer.id

    token = create_access_token({"sub": str(new_customer_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/ai/recommendations?slug=top-seller-cafe", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    # First item should be the top-selling item "Popular Coffee"
    assert data[0]["name"] == "Popular Coffee"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_ai_recommendations_errors_and_roles():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        customer = User(
            email="cust_err@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        restaurant_owner = User(
            email="owner_err@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add_all([customer, restaurant_owner])
        await session.commit()
        customer_id = customer.id
        owner_id = restaurant_owner.id

    cust_token = create_access_token({"sub": str(customer_id)})
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 404 Non-existent restaurant
    res_404 = client.get("/api/v1/ai/recommendations?slug=non-existent-slug", headers=cust_headers)
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Restaurant not found."

    # 403 Restaurant role cannot access
    owner_token = create_access_token({"sub": str(owner_id)})
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    res_403 = client.get("/api/v1/ai/recommendations?slug=non-existent-slug", headers=owner_headers)
    assert res_403.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
