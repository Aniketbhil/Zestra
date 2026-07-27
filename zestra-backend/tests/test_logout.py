from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import AuthProvider, User, UserRole
from app.services.security import create_access_token, generate_token_pair, hash_password

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
async def test_logout_invalidates_refresh_token():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(
            email="logout_user@example.com",
            hashed_password=hash_password("Pass1234!"),
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        user_id = str(user.id)

    tokens = generate_token_pair(user_id, "logout_user@example.com", "customer")
    refresh_token = tokens["refresh_token"]

    # 1. Verify refresh token works before logout
    res_before = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res_before.status_code == 200

    # 2. Call POST /api/v1/auth/logout
    res_logout = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
    assert res_logout.status_code == 200
    assert res_logout.json()["message"] == "Successfully logged out."

    # 3. Verify refresh token fails after logout
    res_after = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res_after.status_code == 401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_logout_with_redis_mocking():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(
            email="logout_redis@example.com",
            hashed_password=hash_password("Pass1234!"),
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        user_id = str(user.id)

    tokens = generate_token_pair(user_id, "logout_redis@example.com", "customer")
    refresh_token = tokens["refresh_token"]

    fake_redis_store = {}

    async def mock_redis_get(key):
        return fake_redis_store.get(key)

    async def mock_redis_set(key, val, ex=None):
        fake_redis_store[key] = val

    with patch("app.api.v1.auth.redis_client.get", side_effect=mock_redis_get), \
         patch("app.api.v1.auth.redis_client.set", side_effect=mock_redis_set):

        res_logout = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
        assert res_logout.status_code == 200

        res_refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert res_refresh.status_code == 401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_logout_invalid_and_access_token_errors():
    # 1. Invalid token
    res_invalid = client.post("/api/v1/auth/logout", json={"refresh_token": "invalid.jwt.token"})
    assert res_invalid.status_code == 400

    # 2. Access token passed as refresh token
    access_token = create_access_token({"sub": "dummy-user-id"})
    res_access = client.post("/api/v1/auth/logout", json={"refresh_token": access_token})
    assert res_access.status_code == 400
    assert res_access.json()["detail"] == "Provided token is not a refresh token."
