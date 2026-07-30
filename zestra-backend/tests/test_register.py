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
    assert "access_token" not in data
    assert "refresh_token" not in data
    assert data["message"] == "Registration successful, please verify the OTP sent to your email"
    assert data["email"] == "customer@example.com"

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


@pytest.mark.asyncio
async def test_register_with_valid_phone_number():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    payload = {
        "email": "phone_user@example.com",
        "password": "ValidP@ssword123",
        "phone_number": "+919876543210",
        "role": "customer",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    async with TestingSessionLocal() as session:
        result = await session.execute(
            Base.metadata.tables["users"].select().where(
                Base.metadata.tables["users"].c.email == "phone_user@example.com"
            )
        )
        user = result.first()
        assert user is not None
        assert user.phone_number == "+919876543210"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_register_with_invalid_phone_number():
    payload = {
        "email": "bad_phone@example.com",
        "password": "ValidP@ssword123",
        "phone_number": "12345",  # Not starting with + or invalid E.164
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_duplicate_phone_number():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    payload1 = {
        "email": "user1_phone@example.com",
        "password": "ValidP@ssword123",
        "phone_number": "+919876543210",
    }
    resp1 = client.post("/api/v1/auth/register", json=payload1)
    assert resp1.status_code == 201

    payload2 = {
        "email": "user2_phone@example.com",
        "password": "ValidP@ssword123",
        "phone_number": "+919876543210",
    }
    resp2 = client.post("/api/v1/auth/register", json=payload2)
    assert resp2.status_code == 400
    assert "Phone number is already registered" in resp2.json()["detail"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_register_otp_redis_storage_and_job_enqueue():
    from unittest.mock import AsyncMock, patch
    from app.core.redis import redis_client

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    payload = {
        "email": "otp_test@example.com",
        "password": "ValidP@ssword123",
        "phone_number": "+919876543210",
    }

    mock_pool = AsyncMock()
    with patch.object(redis_client, "set", new_callable=AsyncMock) as mock_redis_set, \
         patch("app.api.v1.auth.create_pool", new_callable=AsyncMock, return_value=mock_pool):

        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201

        mock_redis_set.assert_called_once()
        redis_key = mock_redis_set.call_args[0][0]
        otp_val = mock_redis_set.call_args[0][1]
        ex_val = mock_redis_set.call_args[1].get("ex")

        assert redis_key == "otp:otp_test@example.com"
        assert len(otp_val) == 6
        assert otp_val.isdigit()
        assert ex_val == 600

        mock_pool.enqueue_job.assert_called_once_with(
            "send_otp_job", "otp_test@example.com", otp_val, "+919876543210"
        )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_send_otp_job_task_execution():
    from unittest.mock import AsyncMock, patch
    from app.workers.tasks import send_otp_job

    with patch("app.workers.tasks.send_otp_email", new_callable=AsyncMock) as mock_send_email, \
         patch("app.workers.tasks.send_otp_sms", new_callable=AsyncMock) as mock_send_sms:

        # Test with phone_number
        await send_otp_job({}, "user@example.com", "123456", "+919876543210")
        mock_send_email.assert_called_once_with("user@example.com", "123456")
        mock_send_sms.assert_called_once_with("+919876543210", "123456")

        mock_send_email.reset_mock()
        mock_send_sms.reset_mock()

        # Test without phone_number (None)
        await send_otp_job({}, "user2@example.com", "654321", None)
        mock_send_email.assert_called_once_with("user2@example.com", "654321")
        mock_send_sms.assert_not_called()

