from fastapi.testclient import TestClient
import pytest
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


async def create_test_user(email: str, role: UserRole) -> tuple[User, dict[str, str]]:
    async with TestingSessionLocal() as session:
        user = User(
            email=email,
            auth_provider=AuthProvider.LOCAL,
            role=role,
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        token = create_access_token({"sub": str(user.id)})
        headers = {"Authorization": f"Bearer {token}"}
        return user, headers


@pytest.mark.asyncio
async def test_delete_restaurant_unconfirmed_rejected():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user, headers = await create_test_user("del_unconfirmed@example.com", UserRole.RESTAURANT)

    client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Delete Bistro 1"},
        headers=headers,
    )

    response = client.request(
        "DELETE",
        "/api/v1/restaurants/me",
        json={"confirm": False},
        headers=headers,
    )
    assert response.status_code == 400
    assert "Deletion not confirmed" in response.json()["detail"]

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_delete_restaurant_success_and_reonboard():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user, headers = await create_test_user("del_success@example.com", UserRole.RESTAURANT)

    # 1. Onboard initial restaurant
    onboard_res = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Delete Bistro 2"},
        headers=headers,
    )
    assert onboard_res.status_code == 201

    # 2. Soft delete restaurant with confirm: true
    del_res = client.request(
        "DELETE",
        "/api/v1/restaurants/me",
        json={"confirm": True},
        headers=headers,
    )
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Restaurant successfully deleted."

    # 3. GET /me now returns 404
    get_me_res = client.get("/api/v1/restaurants/me", headers=headers)
    assert get_me_res.status_code == 404

    # 4. User account remains and can onboard a new restaurant
    new_onboard_res = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "New Bistro 2"},
        headers=headers,
    )
    assert new_onboard_res.status_code == 201
    assert new_onboard_res.json()["name"] == "New Bistro 2"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_delete_restaurant_excluded_from_public_queries():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    user, headers = await create_test_user("del_public@example.com", UserRole.RESTAURANT)

    onboard_res = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Public Delete Bistro"},
        headers=headers,
    )
    slug = onboard_res.json()["slug"]

    # Verify visible in public list
    pub_res = client.get("/api/v1/public/restaurants")
    assert pub_res.status_code == 200
    assert len(pub_res.json()) == 1

    # Soft delete
    client.request(
        "DELETE",
        "/api/v1/restaurants/me",
        json={"confirm": True},
        headers=headers,
    )

    # Excluded from public list
    pub_res_after = client.get("/api/v1/public/restaurants")
    assert pub_res_after.status_code == 200
    assert len(pub_res_after.json()) == 0

    # Public menu returns 404
    pub_menu_res = client.get(f"/api/v1/public/menu/{slug}")
    assert pub_menu_res.status_code == 404

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
