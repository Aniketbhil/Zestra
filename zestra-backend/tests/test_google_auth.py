from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import AuthProvider, UserRole

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


@pytest.fixture
def mock_google_config(monkeypatch):
    monkeypatch.setattr(
        settings, "GOOGLE_CLIENT_ID", "test-google-client-id"
    )
    monkeypatch.setattr(
        settings, "GOOGLE_CLIENT_SECRET", "test-google-client-secret"
    )
    monkeypatch.setattr(
        settings,
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/v1/auth/google/callback",
    )


def test_google_login_redirect(mock_google_config):
    response = client.get(
        "/api/v1/auth/google/login?role=restaurant", follow_redirects=False
    )
    assert response.status_code == 307
    location = response.headers["location"]
    assert "https://accounts.google.com/o/oauth2/v2/auth" in location
    assert "client_id=test-google-client-id" in location
    assert "state=restaurant" in location


@pytest.mark.asyncio
async def test_google_callback_creates_new_user(mock_google_config):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    mock_token_resp = MagicMock()
    mock_token_resp.status_code = 200
    mock_token_resp.json.return_value = {"access_token": "mock-access-token"}

    mock_userinfo_resp = MagicMock()
    mock_userinfo_resp.status_code = 200
    mock_userinfo_resp.json.return_value = {
        "id": "google-12345",
        "email": "newuser@example.com",
    }

    async def mock_post(url, data=None, **kwargs):
        if url == "https://oauth2.googleapis.com/token":
            return mock_token_resp
        return MagicMock(status_code=400)

    async def mock_get(url, headers=None, **kwargs):
        if url == "https://www.googleapis.com/oauth2/v2/userinfo":
            return mock_userinfo_resp
        return MagicMock(status_code=400)

    with patch("httpx.AsyncClient.post", side_effect=mock_post), patch(
        "httpx.AsyncClient.get", side_effect=mock_get
    ):
        response = client.get(
            "/api/v1/auth/google/callback?code=mock_code&state=restaurant",
            follow_redirects=False,
        )
        assert response.status_code == 307
        location = response.headers["location"]
        assert location.startswith(
            f"{settings.FRONTEND_BASE_URL}/oauth/callback#"
        )
        assert "access_token=" in location
        assert "refresh_token=" in location

    # Verify user in database
    async with TestingSessionLocal() as session:
        result = await session.execute(
            Base.metadata.tables["users"].select().where(
                Base.metadata.tables["users"].c.email == "newuser@example.com"
            )
        )
        user_row = result.first()
        assert user_row is not None
        assert user_row.google_id == "google-12345"
        assert user_row.auth_provider == AuthProvider.GOOGLE
        assert user_row.role == UserRole.RESTAURANT
        assert user_row.is_verified is True

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
