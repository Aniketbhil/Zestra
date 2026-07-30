import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
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
async def test_update_restaurant_me_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="update_rest_owner@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Original Gourmet",
            slug="original-gourmet",
            description="Old description",
            address="Old address",
        )
        session.add(restaurant)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "description": "Updated gourmet description",
        "address": "789 Fine Dining Ave",
        "contact_number": "+1-555-0144",
        "business_hours": {
            "mon": "10:00-22:00",
            "tue": "10:00-22:00",
            "wed": "10:00-22:00",
        },
    }

    res = client.patch(
        "/api/v1/restaurants/me", json=update_payload, headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Original Gourmet"  # Name locked
    assert data["slug"] == "original-gourmet"  # Slug locked
    assert data["description"] == "Updated gourmet description"
    assert data["address"] == "789 Fine Dining Ave"
    assert data["contact_number"] == "+1-555-0144"
    assert data["business_hours"] == {
        "mon": "10:00-22:00",
        "tue": "10:00-22:00",
        "wed": "10:00-22:00",
    }

    # Verify via GET /api/v1/restaurants/me
    get_res = client.get("/api/v1/restaurants/me", headers=headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["contact_number"] == "+1-555-0144"
    assert get_data["business_hours"] == update_payload["business_hours"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_restaurant_me_not_onboarded():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="not_onboarded_patch@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.patch(
        "/api/v1/restaurants/me",
        json={"description": "New description"},
        headers=headers,
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Restaurant not onboarded yet."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_restaurant_me_customer_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        customer = User(
            email="cust_patch@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(customer)
        await session.commit()
        customer_id = customer.id

    token = create_access_token({"sub": str(customer_id)})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.patch(
        "/api/v1/restaurants/me",
        json={"description": "New description"},
        headers=headers,
    )
    assert res.status_code == 403

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_restaurant_me_expand_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Onboard restaurant with 5 tables
    async with TestingSessionLocal() as session:
        owner = User(
            email="expand_tables_owner@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
            is_verified=True,
        )
        session.add(owner)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Expand Bistro", "total_tables": 5},
        headers=headers,
    )

    # 2. Expand tables to 8
    patch_res = client.patch(
        "/api/v1/restaurants/me",
        json={"total_tables": 8, "description": "Expanded bistro"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["total_tables"] == 8
    assert patch_data["description"] == "Expanded bistro"

    # 3. Verify tables 1..8 exist in DB
    async with TestingSessionLocal() as session:
        res = await session.execute(
            Base.metadata.tables["tables"].select().where(
                Base.metadata.tables["tables"].c.restaurant_id == patch_data["id"]
            )
        )
        tables = res.fetchall()
        assert len(tables) == 8
        table_numbers = sorted([t.table_number for t in tables])
        assert table_numbers == [1, 2, 3, 4, 5, 6, 7, 8]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_restaurant_me_shrink_tables_rejected():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="shrink_tables_owner@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
            is_verified=True,
        )
        session.add(owner)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Shrink Bistro", "total_tables": 10},
        headers=headers,
    )

    # Attempt to reduce tables from 10 to 5 -> 400 Bad Request
    patch_res = client.patch(
        "/api/v1/restaurants/me",
        json={"total_tables": 5},
        headers=headers,
    )
    assert patch_res.status_code == 400
    assert patch_res.json()["detail"] == "Reducing total tables is not allowed."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_restaurant_me_backfills_stuck_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Setup restaurant directly with total_tables=10 but 0 Table rows
    async with TestingSessionLocal() as session:
        owner = User(
            email="stuck_owner@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
            is_verified=True,
        )
        session.add(owner)
        await session.commit()

        restaurant = Restaurant(
            owner_id=owner.id,
            name="Stuck Restaurant",
            slug="stuck-restaurant",
            total_tables=10,
        )
        session.add(restaurant)
        await session.commit()
        owner_id = owner.id
        rest_id = restaurant.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Call PATCH /me with empty payload or description update
    patch_res = client.patch(
        "/api/v1/restaurants/me",
        json={"description": "Backfilled restaurant"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["total_tables"] == 10

    # Verify 10 Table rows were created retroactively numbered 1..10
    async with TestingSessionLocal() as session:
        res = await session.execute(
            Base.metadata.tables["tables"].select().where(
                Base.metadata.tables["tables"].c.restaurant_id == rest_id
            )
        )
        tables = res.fetchall()
        assert len(tables) == 10
        table_numbers = sorted([t.table_number for t in tables])
        assert table_numbers == list(range(1, 11))

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
