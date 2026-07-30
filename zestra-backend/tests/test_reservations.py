from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
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
async def test_create_reservation_success_and_conflict():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Setup restaurant owner and customer
    owner, _ = await create_test_user("owner@restaurant.com", UserRole.RESTAURANT)
    cust1, headers1 = await create_test_user("cust1@example.com", UserRole.CUSTOMER)
    cust2, headers2 = await create_test_user("cust2@example.com", UserRole.CUSTOMER)

    async with TestingSessionLocal() as session:
        restaurant = Restaurant(
            owner_id=owner.id,
            name="Reserve Diner",
            slug="reserve-diner",
            total_tables=5,
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
        table_id = str(table.id)

    # 2. Cust1 creates a reservation
    payload = {
        "slug": "reserve-diner",
        "table_id": table_id,
        "reservation_date": "2026-08-15",
        "reservation_time": "19:30:00",
        "party_size": 2,
    }
    response1 = client.post("/api/v1/reservations", json=payload, headers=headers1)
    assert response1.status_code == 201
    data1 = response1.json()
    assert data1["status"] == "confirmed"
    assert data1["customer_id"] == str(cust1.id)
    assert data1["table_id"] == table_id
    assert data1["party_size"] == 2

    # 3. Cust2 attempts to book exact same table/date/time -> HTTP 409 Conflict
    response2 = client.post("/api/v1/reservations", json=payload, headers=headers2)
    assert response2.status_code == 409
    assert response2.json()["detail"] == "This table is already booked for the selected time"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_create_reservation_capacity_exceeded_rejected():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner, _ = await create_test_user("owner_cap@restaurant.com", UserRole.RESTAURANT)
    cust, headers = await create_test_user("cust_cap@example.com", UserRole.CUSTOMER)

    async with TestingSessionLocal() as session:
        restaurant = Restaurant(
            owner_id=owner.id,
            name="Cap Diner",
            slug="cap-diner",
            total_tables=1,
        )
        session.add(restaurant)
        await session.commit()

        table = Table(restaurant_id=restaurant.id, table_number=1, capacity=4)
        session.add(table)
        await session.commit()
        table_id = str(table.id)

    # Attempt to book for 6 guests on a 4-guest capacity table
    payload = {
        "slug": "cap-diner",
        "table_id": table_id,
        "reservation_date": "2026-08-15",
        "reservation_time": "19:30:00",
        "party_size": 6,
    }
    response = client.post("/api/v1/reservations", json=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "This table can only seat 4 guests, but 6 were requested"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_create_reservation_forbidden_for_restaurant_role():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner, headers_owner = await create_test_user("owner2@restaurant.com", UserRole.RESTAURANT)

    payload = {
        "slug": "reserve-diner",
        "table_id": "00000000-0000-0000-0000-000000000000",
        "reservation_date": "2026-08-15",
        "reservation_time": "19:30:00",
        "party_size": 2,
    }
    response = client.post("/api/v1/reservations", json=payload, headers=headers_owner)
    assert response.status_code == 403
    assert response.json()["detail"] == "Permission denied: insufficient privileges"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_create_reservation_invalid_slug():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    cust, headers = await create_test_user("cust3@example.com", UserRole.CUSTOMER)

    payload = {
        "slug": "nonexistent-slug",
        "table_id": "00000000-0000-0000-0000-000000000000",
        "reservation_date": "2026-08-15",
        "reservation_time": "19:30:00",
        "party_size": 2,
    }
    response = client.post("/api/v1/reservations", json=payload, headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Restaurant not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_my_reservations_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner, _ = await create_test_user("owner_me@restaurant.com", UserRole.RESTAURANT)
    cust, headers = await create_test_user("cust_me@example.com", UserRole.CUSTOMER)

    async with TestingSessionLocal() as session:
        restaurant = Restaurant(
            owner_id=owner.id,
            name="My Reservations Diner",
            slug="my-res-diner",
            total_tables=2,
        )
        session.add(restaurant)
        await session.commit()

        table = Table(restaurant_id=restaurant.id, table_number=1, capacity=4)
        session.add(table)
        await session.commit()
        table_id = str(table.id)

    payload = {
        "slug": "my-res-diner",
        "table_id": table_id,
        "reservation_date": "2026-08-20",
        "reservation_time": "20:00:00",
        "party_size": 2,
    }
    client.post("/api/v1/reservations", json=payload, headers=headers)

    response = client.get("/api/v1/reservations/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["table_id"] == table_id
    assert data[0]["reservation_date"] == "2026-08-20"
    assert data[0]["party_size"] == 2

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_cancel_reservation_ownership_and_free_slot():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner, _ = await create_test_user("owner_cancel@restaurant.com", UserRole.RESTAURANT)
    cust1, headers1 = await create_test_user("cust1_cancel@example.com", UserRole.CUSTOMER)
    cust2, headers2 = await create_test_user("cust2_cancel@example.com", UserRole.CUSTOMER)

    async with TestingSessionLocal() as session:
        restaurant = Restaurant(
            owner_id=owner.id,
            name="Cancel Diner",
            slug="cancel-diner",
            total_tables=2,
        )
        session.add(restaurant)
        await session.commit()

        table = Table(restaurant_id=restaurant.id, table_number=1, capacity=4)
        session.add(table)
        await session.commit()
        table_id = str(table.id)

    payload = {
        "slug": "cancel-diner",
        "table_id": table_id,
        "reservation_date": "2026-08-25",
        "reservation_time": "19:00:00",
        "party_size": 2,
    }
    res1 = client.post("/api/v1/reservations", json=payload, headers=headers1)
    res1_data = res1.json()
    res_id = res1_data["id"]

    # 1. Cust2 trying to cancel Cust1's reservation receives 403 Forbidden
    cancel_resp_forbidden = client.patch(f"/api/v1/reservations/{res_id}/cancel", headers=headers2)
    assert cancel_resp_forbidden.status_code == 403
    assert "Permission denied" in cancel_resp_forbidden.json()["detail"]

    # 2. Cust1 cancels their own reservation
    cancel_resp = client.patch(f"/api/v1/reservations/{res_id}/cancel", headers=headers1)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # 3. Cust2 can now book the freed slot successfully
    res2 = client.post("/api/v1/reservations", json=payload, headers=headers2)
    assert res2.status_code == 201
    assert res2.json()["customer_id"] == str(cust2.id)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
