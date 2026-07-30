import jwt
from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import AuthProvider, User, UserRole
from app.services.security import hash_password

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
async def test_login_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # First register a user
    reg_payload = {
        "email": "user@example.com",
        "password": "ValidP@ssword123",
        "role": "customer",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201

    # Mark user as verified in DB
    async with TestingSessionLocal() as session:
        await session.execute(
            Base.metadata.tables["users"].update().where(
                Base.metadata.tables["users"].c.email == "user@example.com"
            ).values(is_verified=True)
        )
        await session.commit()

    # Login
    login_payload = {
        "email": "user@example.com",
        "password": "ValidP@ssword123",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    # Decode access token to verify claims (sub, email, role)
    decoded = jwt.decode(
        data["access_token"], settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
    )
    assert decoded["email"] == "user@example.com"
    assert decoded["role"] == "customer"
    assert "sub" in decoded
    assert decoded["type"] == "access"

    # Decode refresh token
    decoded_refresh = jwt.decode(
        data["refresh_token"], settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
    )
    assert decoded_refresh["email"] == "user@example.com"
    assert decoded_refresh["role"] == "customer"
    assert decoded_refresh["sub"] == decoded["sub"]
    assert decoded_refresh["type"] == "refresh"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_login_unverified_user_rejected():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Register user (unverified by default)
    reg_payload = {
        "email": "unverified@example.com",
        "password": "ValidP@ssword123",
        "role": "customer",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201

    login_payload = {
        "email": "unverified@example.com",
        "password": "ValidP@ssword123",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 403
    assert "please verify your email before logging in" in response.json()["detail"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_login_nonexistent_user():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    login_payload = {
        "email": "nonexistent@example.com",
        "password": "ValidP@ssword123",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_login_wrong_password():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg_payload = {
        "email": "user@example.com",
        "password": "ValidP@ssword123",
        "role": "customer",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # Mark user as verified in DB
    async with TestingSessionLocal() as session:
        await session.execute(
            Base.metadata.tables["users"].update().where(
                Base.metadata.tables["users"].c.email == "user@example.com"
            ).values(is_verified=True)
        )
        await session.commit()

    login_payload = {
        "email": "user@example.com",
        "password": "WrongPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_login_google_provider_rejected():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Insert a Google user directly
    async with TestingSessionLocal() as session:
        google_user = User(
            email="googleuser@example.com",
            auth_provider=AuthProvider.GOOGLE,
            google_id="123456789",
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=True,
        )
        session.add(google_user)
        await session.commit()

    login_payload = {
        "email": "googleuser@example.com",
        "password": "AnyPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 400
    assert "Google sign-in" in response.json()["detail"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_login_inactive_user():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Insert an inactive user
    async with TestingSessionLocal() as session:
        inactive_user = User(
            email="inactive@example.com",
            hashed_password=hash_password("ValidP@ssword123"),
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=False,
            is_verified=True,
        )
        session.add(inactive_user)
        await session.commit()

    login_payload = {
        "email": "inactive@example.com",
        "password": "ValidP@ssword123",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Account is inactive."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
