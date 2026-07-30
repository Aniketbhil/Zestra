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
async def test_resend_otp_cooldown_active():
    with patch.object(redis_client, "get", new_callable=AsyncMock, return_value="1"):
        payload = {"email": "cooldown@example.com"}
        response = client.post("/api/v1/auth/resend-otp", json=payload)
        assert response.status_code == 429
        assert "please wait before requesting another code" in response.json()["detail"]


@pytest.mark.asyncio
async def test_resend_otp_user_not_found():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    with patch.object(redis_client, "get", new_callable=AsyncMock, return_value=None):
        payload = {"email": "nonexistent@example.com"}
        response = client.post("/api/v1/auth/resend-otp", json=payload)
        assert response.status_code == 404
        assert response.json()["detail"] == "User not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_resend_otp_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create existing user
    async with TestingSessionLocal() as session:
        user = User(
            email="resend_user@example.com",
            phone_number="+919876543210",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=False,
        )
        session.add(user)
        await session.commit()

    mock_pool = AsyncMock()
    with patch.object(redis_client, "get", new_callable=AsyncMock, return_value=None), \
         patch.object(redis_client, "set", new_callable=AsyncMock) as mock_redis_set, \
         patch("app.api.v1.auth.create_pool", new_callable=AsyncMock, return_value=mock_pool):

        payload = {"email": "resend_user@example.com"}
        response = client.post("/api/v1/auth/resend-otp", json=payload)
        assert response.status_code == 200
        assert response.json()["message"] == "Verification code resent successfully."

        # Verify 2 redis set calls: otp:{email} with ex=600 and otp:cooldown:{email} with ex=60
        assert mock_redis_set.call_count == 2
        set_calls = mock_redis_set.call_args_list

        otp_call = set_calls[0]
        cooldown_call = set_calls[1]

        assert otp_call[0][0] == "otp:resend_user@example.com"
        assert len(otp_call[0][1]) == 6
        assert otp_call[1].get("ex") == 600

        assert cooldown_call[0][0] == "otp:cooldown:resend_user@example.com"
        assert cooldown_call[0][1] == "1"
        assert cooldown_call[1].get("ex") == 60

        mock_pool.enqueue_job.assert_called_once_with(
            "send_otp_job", "resend_user@example.com", otp_call[0][1], "+919876543210"
        )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
