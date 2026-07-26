from decimal import Decimal
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.services.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.menu_item import MenuItem
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
async def test_create_guest_order():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_order@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Pizza Palace",
            slug="pizza-palace",
        )
        session.add(restaurant)
        await session.commit()

        item1 = MenuItem(
            restaurant_id=restaurant.id,
            name="Pepperoni Pizza",
            price=Decimal("18.50"),
            category="Pizzas",
            is_available=True,
        )
        item2 = MenuItem(
            restaurant_id=restaurant.id,
            name="Garlic Bread",
            price=Decimal("6.00"),
            category="Sides",
            is_available=True,
        )
        session.add_all([item1, item2])
        await session.commit()

        item1_id = item1.id
        item2_id = item2.id

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = {
            "items": [
                {"menu_item_id": str(item1_id), "quantity": 2},
                {"menu_item_id": str(item2_id), "quantity": 1},
            ]
        }
        res = await client.post("/api/v1/public/orders/pizza-palace", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["restaurant_id"] == str(restaurant.id)
        assert data["customer_id"] is None
        assert data["status"] == "received"
        # 18.50 * 2 + 6.00 * 1 = 43.00
        assert float(data["total"]) == 43.00
        assert len(data["items"]) == 2

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_create_authenticated_order():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_order_auth@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        customer = User(
            email="customer_order@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add_all([owner, customer])
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Sushi Spot",
            slug="sushi-spot",
        )
        session.add(restaurant)
        await session.commit()

        item = MenuItem(
            restaurant_id=restaurant.id,
            name="Salmon Roll",
            price=Decimal("12.00"),
            category="Sushi",
            is_available=True,
        )
        session.add(item)
        await session.commit()

        customer_id = customer.id
        item_id = item.id

    token = create_access_token({"sub": str(customer_id)})

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = [{"menu_item_id": str(item_id), "quantity": 3}]
        res = await client.post(
            "/api/v1/public/orders/sushi-spot",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["customer_id"] == str(customer_id)
        assert data["status"] == "received"
        assert float(data["total"]) == 36.00

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_create_order_nonexistent_restaurant():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = {"items": [{"menu_item_id": str(uuid.uuid4()), "quantity": 1}]}
        res = await client.post(
            "/api/v1/public/orders/non-existent-slug", json=payload
        )
        assert res.status_code == 404
        assert res.json()["detail"] == "Restaurant not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_create_order_unavailable_or_invalid_item():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="owner_unavail@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Taco Haven",
            slug="taco-haven",
        )
        session.add(restaurant)
        await session.commit()

        available_item = MenuItem(
            restaurant_id=restaurant.id,
            name="Beef Taco",
            price=Decimal("4.50"),
            category="Tacos",
            is_available=True,
        )
        unavailable_item = MenuItem(
            restaurant_id=restaurant.id,
            name="Special Taco",
            price=Decimal("8.00"),
            category="Tacos",
            is_available=False,
        )
        session.add_all([available_item, unavailable_item])
        await session.commit()

        unavail_id = unavailable_item.id

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = {
            "items": [
                {"menu_item_id": str(unavail_id), "quantity": 1},
            ]
        }
        res = await client.post("/api/v1/public/orders/taco-haven", json=payload)
        assert res.status_code == 400
        assert "unavailable or invalid" in res.json()["detail"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
