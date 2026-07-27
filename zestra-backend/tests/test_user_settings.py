import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
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
async def test_toggle_user_notifications_setting():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        user = User(
            email="user_setting@example.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.CUSTOMER,
            is_active=True,
            notifications_enabled=True,
        )
        session.add(user)
        await session.commit()
        user_id = user.id

    token = create_access_token({"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Verify initial setting is True
    res_initial = client.get("/api/v1/users/me/profile", headers=headers)
    assert res_initial.status_code == 200
    assert res_initial.json()["notifications_enabled"] is True

    # 2. Toggle notifications_enabled to False via PATCH /api/v1/users/me/settings
    res_patch = client.patch(
        "/api/v1/users/me/settings",
        json={"notifications_enabled": False},
        headers=headers,
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["notifications_enabled"] is False

    # 3. Verify setting via GET /api/v1/users/me/profile
    res_get = client.get("/api/v1/users/me/profile", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["notifications_enabled"] is False

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_update_user_settings_unauthenticated():
    res = client.patch(
        "/api/v1/users/me/settings",
        json={"notifications_enabled": False},
    )
    assert res.status_code == 401
