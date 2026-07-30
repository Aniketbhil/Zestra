from datetime import date, time
from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
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
async def test_get_public_tables_nonexistent_restaurant():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    response = client.get("/api/v1/public/tables/nonexistent-slug?date=2026-08-01")
    assert response.status_code == 404
    assert response.json()["detail"] == "Restaurant not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_public_tables_success_with_booked_slots():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Create users
        owner = User(
            email="owner@bistro.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
        )
        customer = User(
            email="cust@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
        )
        session.add_all([owner, customer])
        await session.commit()

        # Create restaurant & tables
        restaurant = Restaurant(
            owner_id=owner.id,
            name="Public Bistro",
            slug="public-bistro",
            total_tables=2,
        )
        session.add(restaurant)
        await session.commit()

        t1 = Table(restaurant_id=restaurant.id, table_number=1, capacity=4)
        t2 = Table(restaurant_id=restaurant.id, table_number=2, capacity=2)
        session.add_all([t1, t2])
        await session.commit()

        # Create confirmed reservation for table 1 at 19:00:00
        res1 = Reservation(
            table_id=t1.id,
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            reservation_date=date(2026, 8, 1),
            reservation_time=time(19, 0),
            status=ReservationStatus.CONFIRMED,
        )
        # Create cancelled reservation for table 1 at 20:00:00 (should NOT show in booked_slots)
        res2 = Reservation(
            table_id=t1.id,
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            reservation_date=date(2026, 8, 1),
            reservation_time=time(20, 0),
            status=ReservationStatus.CANCELLED,
        )
        session.add_all([res1, res2])
        await session.commit()

    # Call endpoint without auth header
    response = client.get("/api/v1/public/tables/public-bistro?date=2026-08-01")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # Check table 1
    assert data[0]["table_number"] == 1
    assert data[0]["capacity"] == 4
    assert data[0]["booked_slots"] == ["19:00:00"]

    # Check table 2
    assert data[1]["table_number"] == 2
    assert data[1]["capacity"] == 2
    assert data[1]["booked_slots"] == []

    # Querying a different date returns empty booked_slots
    resp_other_date = client.get("/api/v1/public/tables/public-bistro?date=2026-08-02")
    assert resp_other_date.status_code == 200
    data_other = resp_other_date.json()
    assert data_other[0]["booked_slots"] == []

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
