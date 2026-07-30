from datetime import date, time
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.reservation import Reservation, ReservationStatus
from app.models.restaurant import Restaurant
from app.models.table import Table
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
async def test_reservation_partial_unique_index():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Create user, restaurant, and table
        user = User(
            email="customer@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
        )
        owner = User(
            email="owner@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
        )
        session.add_all([user, owner])
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Test Diner",
            slug="test-diner",
            total_tables=10,
        )
        session.add(restaurant)
        await session.commit()

        table = Table(
            restaurant_id=restaurant.id,
            table_number=1,
            capacity=4,
        )
        session.add(table)
        await session.commit()

        # 1. Create first confirmed reservation
        res1 = Reservation(
            table_id=table.id,
            restaurant_id=restaurant.id,
            customer_id=user.id,
            reservation_date=date(2026, 8, 1),
            reservation_time=time(19, 0),
            status=ReservationStatus.CONFIRMED,
        )
        session.add(res1)
        await session.commit()

        # 2. Attempt duplicate confirmed reservation on same table/date/time -> IntegrityError
        res2 = Reservation(
            table_id=table.id,
            restaurant_id=restaurant.id,
            customer_id=user.id,
            reservation_date=date(2026, 8, 1),
            reservation_time=time(19, 0),
            status=ReservationStatus.CONFIRMED,
        )
        session.add(res2)
        with pytest.raises(IntegrityError):
            await session.commit()

        await session.rollback()

        # 3. Create a cancelled reservation on the same table/date/time -> succeeds
        res3 = Reservation(
            table_id=table.id,
            restaurant_id=restaurant.id,
            customer_id=user.id,
            reservation_date=date(2026, 8, 1),
            reservation_time=time(19, 0),
            status=ReservationStatus.CANCELLED,
        )
        session.add(res3)
        await session.commit()

        assert res3.id is not None
        assert res3.status == ReservationStatus.CANCELLED

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
