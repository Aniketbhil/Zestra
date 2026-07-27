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
async def test_restaurant_image_url_lifecycle():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        owner = User(
            email="image_owner@restaurant.com",
            auth_provider=AuthProvider.LOCAL,
            role=UserRole.RESTAURANT,
            is_active=True,
        )
        session.add(owner)
        await session.commit()
        owner_id = owner.id

    token = create_access_token({"sub": str(owner_id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Onboard restaurant with image_url
    onboard_payload = {
        "name": "Image Palace",
        "description": "Delicious food with nice banner",
        "address": "123 Banner St",
        "image_url": "https://example.com/banner.jpg",
    }
    res_onboard = client.post(
        "/api/v1/restaurants/onboard", json=onboard_payload, headers=headers
    )
    assert res_onboard.status_code == 201
    data_onboard = res_onboard.json()
    assert data_onboard["image_url"] == "https://example.com/banner.jpg"
    slug = data_onboard["slug"]

    # 2. GET /api/v1/restaurants/me includes image_url
    res_me = client.get("/api/v1/restaurants/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["image_url"] == "https://example.com/banner.jpg"

    # 3. GET /api/v1/public/restaurants includes image_url
    res_pub = client.get("/api/v1/public/restaurants")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert len(pub_data) == 1
    assert pub_data[0]["image_url"] == "https://example.com/banner.jpg"

    # 4. GET /api/v1/public/menu/{slug} includes image_url
    res_menu = client.get(f"/api/v1/public/menu/{slug}")
    assert res_menu.status_code == 200
    menu_data = res_menu.json()
    assert menu_data["image_url"] == "https://example.com/banner.jpg"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
