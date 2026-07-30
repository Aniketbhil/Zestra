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


async def create_test_user(email: str, role: UserRole) -> tuple[User, dict[str, str]]:
    async with TestingSessionLocal() as session:
        user = User(
            email=email,
            auth_provider=AuthProvider.LOCAL,
            role=role,
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        token = create_access_token({"sub": str(user.id)})
        headers = {"Authorization": f"Bearer {token}"}
        return user, headers


@pytest.mark.asyncio
async def test_dashboard_get_reservations_and_filter_by_date():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner, owner_headers = await create_test_user("dash_owner@restaurant.com", UserRole.RESTAURANT)
    cust, _ = await create_test_user("dash_cust@example.com", UserRole.CUSTOMER)

    async with TestingSessionLocal() as session:
        restaurant = Restaurant(
            owner_id=owner.id,
            name="Dashboard Bistro",
            slug="dash-bistro",
            total_tables=3,
        )
        session.add(restaurant)
        await session.commit()

        table = Table(restaurant_id=restaurant.id, table_number=1, capacity=4)
        session.add(table)
        await session.commit()

        res1 = Reservation(
            table_id=table.id,
            restaurant_id=restaurant.id,
            customer_id=cust.id,
            reservation_date=date(2026, 9, 10),
            reservation_time=time(18, 0),
            status=ReservationStatus.CONFIRMED,
        )
        res2 = Reservation(
            table_id=table.id,
            restaurant_id=restaurant.id,
            customer_id=cust.id,
            reservation_date=date(2026, 9, 11),
            reservation_time=time(19, 0),
            status=ReservationStatus.CONFIRMED,
        )
        session.add_all([res1, res2])
        await session.commit()

    # 1. Fetch all dashboard reservations without date filter
    resp_all = client.get("/api/v1/dashboard/reservations", headers=owner_headers)
    assert resp_all.status_code == 200
    data_all = resp_all.json()
    assert len(data_all) == 2

    # 2. Fetch filtered by date
    resp_filtered = client.get("/api/v1/dashboard/reservations?date=2026-09-10", headers=owner_headers)
    assert resp_filtered.status_code == 200
    data_filtered = resp_filtered.json()
    assert len(data_filtered) == 1
    assert data_filtered[0]["reservation_date"] == "2026-09-10"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_dashboard_update_reservation_status():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner, owner_headers = await create_test_user("dash_owner2@restaurant.com", UserRole.RESTAURANT)
    cust, _ = await create_test_user("dash_cust2@example.com", UserRole.CUSTOMER)

    async with TestingSessionLocal() as session:
        restaurant = Restaurant(
            owner_id=owner.id,
            name="Dashboard Bistro 2",
            slug="dash-bistro-2",
            total_tables=2,
        )
        session.add(restaurant)
        await session.commit()

        table = Table(restaurant_id=restaurant.id, table_number=1, capacity=4)
        session.add(table)
        await session.commit()

        res1 = Reservation(
            table_id=table.id,
            restaurant_id=restaurant.id,
            customer_id=cust.id,
            reservation_date=date(2026, 9, 15),
            reservation_time=time(20, 0),
            status=ReservationStatus.CONFIRMED,
        )
        session.add(res1)
        await session.commit()
        res_id = str(res1.id)

    # 1. Mark completed
    resp_comp = client.patch(
        f"/api/v1/dashboard/reservations/{res_id}/status",
        json={"status": "completed"},
        headers=owner_headers,
    )
    assert resp_comp.status_code == 200
    assert resp_comp.json()["status"] == "completed"

    # 2. Mark cancelled
    resp_cancel = client.patch(
        f"/api/v1/dashboard/reservations/{res_id}/status",
        json={"status": "cancelled"},
        headers=owner_headers,
    )
    assert resp_cancel.status_code == 200
    assert resp_cancel.json()["status"] == "cancelled"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
