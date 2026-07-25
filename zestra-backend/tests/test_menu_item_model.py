from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
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


@pytest.mark.asyncio
async def test_menu_item_model_creation():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(
            email="itemowner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        restaurant = Restaurant(
            owner_id=user.id,
            name="Burger House",
            slug="burger-house",
            description="Best burgers in town",
            address="456 Oak St",
        )
        session.add(restaurant)
        await session.commit()
        await session.refresh(restaurant)

        item = MenuItem(
            restaurant_id=restaurant.id,
            name="Cheeseburger",
            description="Delicious beef cheeseburger with cheddar",
            price=Decimal("12.99"),
            category="Main Course",
            image_url="https://example.com/images/cheeseburger.jpg",
            is_available=True,
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)

        assert item.id is not None
        assert item.restaurant_id == restaurant.id
        assert item.name == "Cheeseburger"
        assert item.price == Decimal("12.99")
        assert item.category == "Main Course"
        assert item.is_available is True
        assert item.created_at is not None

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
