from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import AuthProvider, UserRole
from app.services.security import verify_password

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
async def test_register_customer_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    payload = {
        "email": "customer@example.com",
        "password": "ValidP@ssword123",
        "role": "customer",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    # Verify user in database
    async with TestingSessionLocal() as session:
        result = await session.execute(
            Base.metadata.tables["users"].select().where(
                Base.metadata.tables["users"].c.email == "customer@example.com"
            )
        )
        user = result.first()
        assert user is not None
        assert user.auth_provider == AuthProvider.LOCAL
        assert user.role == UserRole.CUSTOMER
        assert user.hashed_password is not None
        assert verify_password("ValidP@ssword123", user.hashed_password) is True

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_register_restaurant_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    payload = {
        "email": "restaurant@example.com",
        "password": "ValidP@ssword123",
        "role": "restaurant",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    async with TestingSessionLocal() as session:
        result = await session.execute(
            Base.metadata.tables["users"].select().where(
                Base.metadata.tables["users"].c.email == "restaurant@example.com"
            )
        )
        user = result.first()
        assert user is not None
        assert user.role == UserRole.RESTAURANT

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_register_admin_rejected():
    payload = {
        "email": "admin@example.com",
        "password": "ValidP@ssword123",
        "role": "admin",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_duplicate_email():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    payload = {
        "email": "duplicate@example.com",
        "password": "ValidP@ssword123",
        "role": "customer",
    }
    resp1 = client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 400
    assert resp2.json()["detail"] == "Email is already registered."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_register_weak_password():
    payload = {
        "email": "weakpassword@example.com",
        "password": "weak",
        "role": "customer",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email():
    payload = {
        "email": "invalid-email-format",
        "password": "ValidP@ssword123",
        "role": "customer",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_email_normalized():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    payload = {
        "email": "  USER.TEST@EXAMPLE.COM ",
        "password": "ValidP@ssword123",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    async with TestingSessionLocal() as session:
        result = await session.execute(
            Base.metadata.tables["users"].select().where(
                Base.metadata.tables["users"].c.email == "user.test@example.com"
            )
        )
        user = result.first()
        assert user is not None

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

