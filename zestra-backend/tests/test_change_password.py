import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import AuthProvider, User, UserRole
from app.services.security import create_access_token, hash_password

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
async def test_change_password_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(
            email="change_pass_user@example.com",
            hashed_password=hash_password("OldPass123!"),
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        user_id = user.id

    token = create_access_token({"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "current_password": "OldPass123!",
        "new_password": "NewPass123!",
    }
    res = client.patch(
        "/api/v1/auth/change-password", json=payload, headers=headers
    )
    assert res.status_code == 200

    # Verify old password fails login
    login_old = client.post(
        "/api/v1/auth/login",
        json={"email": "change_pass_user@example.com", "password": "OldPass123!"},
    )
    assert login_old.status_code == 401

    # Verify new password succeeds login
    login_new = client.post(
        "/api/v1/auth/login",
        json={"email": "change_pass_user@example.com", "password": "NewPass123!"},
    )
    assert login_new.status_code == 200

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_change_password_incorrect_current_password():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(
            email="wrong_pass_user@example.com",
            hashed_password=hash_password("ValidPass123!"),
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        user_id = user.id

    token = create_access_token({"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "current_password": "WrongPassword123!",
        "new_password": "NewPass123!",
    }
    res = client.patch(
        "/api/v1/auth/change-password", json=payload, headers=headers
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Incorrect current password."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_change_password_weak_new_password():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(
            email="weak_pass_user@example.com",
            hashed_password=hash_password("ValidPass123!"),
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        user_id = user.id

    token = create_access_token({"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "current_password": "ValidPass123!",
        "new_password": "weak",
    }
    res = client.patch(
        "/api/v1/auth/change-password", json=payload, headers=headers
    )
    assert res.status_code == 422

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_change_password_google_auth_user_rejected():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        google_user = User(
            email="google_user@example.com",
            auth_provider=AuthProvider.GOOGLE,
            google_id="google-999",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(google_user)
        await session.commit()
        google_user_id = google_user.id

    token = create_access_token({"sub": str(google_user_id)})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "current_password": "Anything123!",
        "new_password": "NewPass123!",
    }
    res = client.patch(
        "/api/v1/auth/change-password", json=payload, headers=headers
    )
    assert res.status_code == 400
    assert (
        res.json()["detail"]
        == "password managed by Google — no local password to change"
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_change_password_unauthenticated():
    res = client.patch(
        "/api/v1/auth/change-password",
        json={"current_password": "a", "new_password": "b"},
    )
    assert res.status_code == 401
