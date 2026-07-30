from datetime import date, time
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
async def test_ws_tables_update_broadcast():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    owner, _ = await create_test_user("owner@wstables.com", UserRole.RESTAURANT)
    cust, cust_headers = await create_test_user("cust@wstables.com", UserRole.CUSTOMER)

    async with TestingSessionLocal() as session:
        restaurant = Restaurant(
            owner_id=owner.id,
            name="WS Bistro",
            slug="ws-bistro",
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

    # Open WebSocket connection to /ws/tables/ws-bistro
    with client.websocket_connect("/ws/tables/ws-bistro") as websocket:
        # Create reservation
        payload = {
            "slug": "ws-bistro",
            "table_id": table_id,
            "reservation_date": "2026-09-01",
            "reservation_time": "18:00:00",
            "party_size": 2,
        }
        res_create = client.post("/api/v1/reservations", json=payload, headers=cust_headers)
        assert res_create.status_code == 201
        res_data = res_create.json()
        reservation_id = res_data["id"]

        # Assert WebSocket receives booked update
        ws_msg_booked = websocket.receive_json()
        assert ws_msg_booked["type"] == "table_update"
        assert ws_msg_booked["table_id"] == table_id
        assert ws_msg_booked["date"] == "2026-09-01"
        assert ws_msg_booked["time"] == "18:00:00"
        assert ws_msg_booked["status"] == "booked"

        # Cancel reservation
        res_cancel = client.patch(f"/api/v1/reservations/{reservation_id}/cancel", headers=cust_headers)
        assert res_cancel.status_code == 200

        # Assert WebSocket receives available update
        ws_msg_avail = websocket.receive_json()
        assert ws_msg_avail["type"] == "table_update"
        assert ws_msg_avail["table_id"] == table_id
        assert ws_msg_avail["date"] == "2026-09-01"
        assert ws_msg_avail["time"] == "18:00:00"
        assert ws_msg_avail["status"] == "available"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
