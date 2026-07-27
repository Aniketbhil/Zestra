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
async def test_get_public_restaurants_success_and_no_owner_id():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner1 = User(
            email="owner1_pub@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        owner2 = User(
            email="owner2_pub@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add_all([owner1, owner2])
        await session.commit()

        rest1 = Restaurant(
            owner_id=owner1.id,
            name="Alpha Bistro",
            slug="alpha-bistro",
            description="Alpha description",
            address="123 Alpha St",
        )
        rest2 = Restaurant(
            owner_id=owner2.id,
            name="Beta Cafe",
            slug="beta-cafe",
            description="Beta description",
            address="456 Beta Ave",
        )
        session.add_all([rest1, rest2])
        await session.commit()

    # Public fetch without authentication
    res = client.get("/api/v1/public/restaurants")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2

    # Verify fields returned and absence of sensitive internal fields
    for rest in data:
        assert "id" in rest
        assert "name" in rest
        assert "slug" in rest
        assert "description" in rest
        assert "address" in rest
        assert "owner_id" not in rest
        assert "new_order_notifications_enabled" not in rest

    assert data[0]["name"] == "Alpha Bistro"
    assert data[1]["name"] == "Beta Cafe"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_public_restaurants_pagination():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owners = [
            User(
                email=f"pag_owner{i}@restaurant.com",
                auth_provider=AuthProvider.LOCAL,
                role=UserRole.RESTAURANT,
                is_active=True,
            )
            for i in range(5)
        ]
        session.add_all(owners)
        await session.commit()

        restaurants = [
            Restaurant(
                owner_id=owners[i].id,
                name=f"Rest {i:02d}",
                slug=f"rest-{i:02d}",
            )
            for i in range(5)
        ]
        session.add_all(restaurants)
        await session.commit()

    # Limit = 2, offset = 0 -> returns first 2
    res1 = client.get("/api/v1/public/restaurants?limit=2&offset=0")
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1) == 2
    assert data1[0]["name"] == "Rest 00"
    assert data1[1]["name"] == "Rest 01"

    # Limit = 2, offset = 2 -> returns next 2
    res2 = client.get("/api/v1/public/restaurants?limit=2&offset=2")
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2) == 2
    assert data2[0]["name"] == "Rest 02"
    assert data2[1]["name"] == "Rest 03"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_public_restaurants_empty():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    res = client.get("/api/v1/public/restaurants")
    assert res.status_code == 200
    assert res.json() == []

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
