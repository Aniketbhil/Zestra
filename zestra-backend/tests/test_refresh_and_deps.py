from datetime import timedelta

from fastapi import Depends, APIRouter
from fastapi.testclient import TestClient
import jwt
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.deps import get_current_user, require_role
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import AuthProvider, User, UserRole
from app.services.security import create_access_token, generate_token_pair

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


# Create temporary router for testing require_role dependency
role_test_router = APIRouter(prefix="/test-roles")


@role_test_router.get("/admin-only")
def admin_only_route(current_user: User = Depends(require_role(UserRole.ADMIN))):
    return {"message": f"Hello admin {current_user.email}"}


@role_test_router.get("/customer-only")
def customer_only_route(
    current_user: User = Depends(require_role(UserRole.CUSTOMER, "restaurant"))
):
    return {"message": f"Hello customer or restaurant {current_user.email}"}


app.include_router(role_test_router)


@pytest.fixture(autouse=True)
def setup_dependency_override():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


@pytest.mark.asyncio
async def test_refresh_token_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Register user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "refreshtest@example.com",
            "password": "ValidP@ssword123",
            "role": "customer",
        },
    )
    assert reg_resp.status_code == 201
    tokens = reg_resp.json()

    # Request refresh
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    assert new_tokens["token_type"] == "bearer"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_refresh_token_invalid_type_rejected():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "invalidtype@example.com",
            "password": "ValidP@ssword123",
        },
    )
    tokens = reg_resp.json()

    # Pass access_token instead of refresh_token
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["access_token"]},
    )
    assert refresh_resp.status_code == 400
    assert refresh_resp.json()["detail"] == "Provided token is not a refresh token."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_refresh_token_malformed_rejected():
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid.jwt.token"},
    )
    assert refresh_resp.status_code == 401
    assert refresh_resp.json()["detail"] == "Invalid or expired refresh token."


@pytest.mark.asyncio
async def test_get_me_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "metest@example.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()

    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me_resp.status_code == 200
    user_data = me_resp.json()
    assert user_data["email"] == "metest@example.com"
    assert user_data["role"] == "restaurant"
    assert user_data["auth_provider"] == "local"
    assert user_data["is_active"] is True
    assert "id" in user_data

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_me_unauthorized():
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 403 or me_resp.status_code == 401


@pytest.mark.asyncio
async def test_require_role_dependency():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "customer_role@example.com",
            "password": "ValidP@ssword123",
            "role": "customer",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Customer route should be allowed
    resp1 = client.get("/test-roles/customer-only", headers=headers)
    assert resp1.status_code == 200

    # Admin route should be forbidden (403)
    resp2 = client.get("/test-roles/admin-only", headers=headers)
    assert resp2.status_code == 403
    assert resp2.json()["detail"] == "Permission denied: insufficient privileges"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
