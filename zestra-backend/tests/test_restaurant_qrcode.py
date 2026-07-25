import base64
from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app

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
async def test_get_restaurant_qrcode_success():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Register restaurant owner
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner1@testqrcode.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    assert reg_resp.status_code == 201
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # 2. Onboard restaurant
    onboard_resp = client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "The Pizza Place"},
        headers=headers,
    )
    assert onboard_resp.status_code == 201
    slug = onboard_resp.json()["slug"]
    assert slug == "the-pizza-place"

    # 3. Get QR code
    qr_resp = client.get(
        f"/api/v1/restaurants/{slug}/qrcode",
        headers=headers,
    )
    assert qr_resp.status_code == 200
    data = qr_resp.json()
    assert "qr_code_base64" in data
    assert "menu_url" in data
    assert data["menu_url"] == f"http://localhost:3000/menu/{slug}"

    # Verify base64 string is valid PNG image
    decoded_bytes = base64.b64decode(data["qr_code_base64"])
    assert decoded_bytes.startswith(b"\x89PNG")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_restaurant_qrcode_not_owner():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Register owner 1 and onboard
    r1 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner1@qrdemo.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    t1 = r1.json()
    h1 = {"Authorization": f"Bearer {t1['access_token']}"}
    client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "First Diner"},
        headers=h1,
    )

    # Register owner 2 and onboard
    r2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner2@qrdemo.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    t2 = r2.json()
    h2 = {"Authorization": f"Bearer {t2['access_token']}"}
    client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Second Diner"},
        headers=h2,
    )

    # Owner 2 tries to access owner 1's QR code
    qr_resp = client.get(
        "/api/v1/restaurants/first-diner/qrcode",
        headers=h2,
    )
    assert qr_resp.status_code == 403
    assert (
        qr_resp.json()["detail"]
        == "Permission denied: user does not own this restaurant."
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_restaurant_qrcode_not_found():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@qrnotfound.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    t = reg.json()
    h = {"Authorization": f"Bearer {t['access_token']}"}

    qr_resp = client.get(
        "/api/v1/restaurants/non-existent-slug/qrcode",
        headers=h,
    )
    assert qr_resp.status_code == 404
    assert qr_resp.json()["detail"] == "Restaurant not found."

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_restaurant_qrcode_customer_role_forbidden():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "customer@qrtest.com",
            "password": "ValidP@ssword123",
            "role": "customer",
        },
    )
    t = reg.json()
    h = {"Authorization": f"Bearer {t['access_token']}"}

    qr_resp = client.get(
        "/api/v1/restaurants/any-slug/qrcode",
        headers=h,
    )
    assert qr_resp.status_code == 403
    assert qr_resp.json()["detail"] == "Permission denied: insufficient privileges"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_restaurant_qrcode_unauthenticated():
    qr_resp = client.get("/api/v1/restaurants/any-slug/qrcode")
    assert qr_resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_restaurant_qrcode_custom_frontend_url(monkeypatch):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    monkeypatch.setattr(settings, "FRONTEND_BASE_URL", "https://zestra.app/")

    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@customfrontend.com",
            "password": "ValidP@ssword123",
            "role": "restaurant",
        },
    )
    tokens = reg_resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    client.post(
        "/api/v1/restaurants/onboard",
        json={"name": "Custom Domain Bistro"},
        headers=headers,
    )

    qr_resp = client.get(
        "/api/v1/restaurants/custom-domain-bistro/qrcode",
        headers=headers,
    )
    assert qr_resp.status_code == 200
    data = qr_resp.json()
    assert data["menu_url"] == "https://zestra.app/menu/custom-domain-bistro"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
