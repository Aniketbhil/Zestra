from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.redis import redis_client
from app.db.base import Base
from app.db.session import get_db
from app.main import app
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
async def test_verify_otp_missing_redis_key():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    with patch.object(redis_client, "get", new_callable=AsyncMock, return_value=None):
        payload = {"email": "expired@example.com", "otp": "123456"}
        response = client.post("/api/v1/auth/verify-otp", json=payload)
        assert response.status_code == 400
        assert "OTP expired, please request a new one" in response.json()["detail"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_verify_otp_mismatched_otp():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    with patch.object(redis_client, "get", new_callable=AsyncMock, return_value="654321"):
        payload = {"email": "mismatch@example.com", "otp": "123456"}
        response = client.post("/api/v1/auth/verify-otp", json=payload)
        assert response.status_code == 400
        assert "invalid OTP" in response.json()["detail"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_verify_otp_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create unverified user in DB
    async with TestingSessionLocal() as session:
        user = User(
            email="verify_success@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=False,
        )
        session.add(user)
        await session.commit()

    with patch.object(redis_client, "get", new_callable=AsyncMock, return_value="123456") as mock_get, \
         patch.object(redis_client, "delete", new_callable=AsyncMock) as mock_delete:

        payload = {"email": "verify_success@example.com", "otp": "123456"}
        response = client.post("/api/v1/auth/verify-otp", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

        mock_get.assert_called_once_with("otp:verify_success@example.com")
        mock_delete.assert_called_once_with("otp:verify_success@example.com")

    # Verify user.is_verified is True in DB
    async with TestingSessionLocal() as session:
        result = await session.execute(
            Base.metadata.tables["users"].select().where(
                Base.metadata.tables["users"].c.email == "verify_success@example.com"
            )
        )
        db_user = result.first()
        assert db_user is not None
        assert db_user.is_verified is True

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
