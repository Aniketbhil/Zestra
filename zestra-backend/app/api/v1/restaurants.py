import base64
import io
import uuid
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import require_role
from app.db.session import get_db
from app.models.restaurant import Restaurant
from app.models.table import Table
from app.models.user import User, UserRole
from app.schemas.restaurant import (
    RestaurantCreate,
    RestaurantDeleteRequest,
    RestaurantQRCodeResponse,
    RestaurantResponse,
    RestaurantSettingsUpdate,
    RestaurantUpdate,
)
from app.services.restaurant import generate_unique_slug

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


@router.post(
    "/onboard",
    response_model=RestaurantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def onboard_restaurant(
    payload: RestaurantCreate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Onboard a new restaurant profile for the authenticated user with 'restaurant' role."""
    # Check if current user already has an active restaurant profile (1:1 constraint)
    existing_stmt = select(Restaurant.id).where(
        Restaurant.owner_id == current_user.id,
        Restaurant.is_deleted == False,
    )
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant profile already exists for this user.",
        )

    # Generate unique slug
    slug = await generate_unique_slug(db, payload.name)

    # Create restaurant record
    restaurant = Restaurant(
        owner_id=current_user.id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        address=payload.address,
        image_url=payload.image_url,
        total_tables=payload.total_tables,
    )
    db.add(restaurant)
    await db.flush()

    # Auto-create Table rows numbered 1 through total_tables
    tables = [
        Table(
            restaurant_id=restaurant.id,
            table_number=i,
            capacity=4,
        )
        for i in range(1, payload.total_tables + 1)
    ]
    db.add_all(tables)
    await db.commit()
    await db.refresh(restaurant)

    return restaurant


@router.get(
    "/me",
    response_model=RestaurantResponse,
    status_code=status.HTTP_200_OK,
)
async def get_my_restaurant(
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated user's linked Restaurant profile."""
    stmt = select(Restaurant).where(
        Restaurant.owner_id == current_user.id,
        Restaurant.is_deleted == False,
    )
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not onboarded yet.",
        )

    return restaurant


@router.patch(
    "/me",
    response_model=RestaurantResponse,
    status_code=status.HTTP_200_OK,
)
async def update_my_restaurant(
    payload: RestaurantUpdate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's Restaurant details."""
    stmt = select(Restaurant).where(
        Restaurant.owner_id == current_user.id,
        Restaurant.is_deleted == False,
    )
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not onboarded yet.",
        )

    if payload.total_tables is not None:
        if payload.total_tables < restaurant.total_tables:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reducing total tables is not allowed.",
            )
        if payload.total_tables > restaurant.total_tables:
            current_count = restaurant.total_tables
            new_tables = [
                Table(
                    restaurant_id=restaurant.id,
                    table_number=i,
                    capacity=4,
                )
                for i in range(current_count + 1, payload.total_tables + 1)
            ]
            db.add_all(new_tables)
            restaurant.total_tables = payload.total_tables

    if payload.description is not None:
        restaurant.description = payload.description
    if payload.address is not None:
        restaurant.address = payload.address
    if payload.contact_number is not None:
        restaurant.contact_number = payload.contact_number
    if payload.business_hours is not None:
        restaurant.business_hours = payload.business_hours
    if payload.image_url is not None:
        restaurant.image_url = payload.image_url

    await db.commit()
    await db.refresh(restaurant)

    return restaurant


@router.patch(
    "/me/settings",
    response_model=RestaurantResponse,
    status_code=status.HTTP_200_OK,
)
async def update_my_restaurant_settings(
    payload: RestaurantSettingsUpdate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Update settings for the authenticated user's Restaurant profile."""
    stmt = select(Restaurant).where(
        Restaurant.owner_id == current_user.id,
        Restaurant.is_deleted == False,
    )
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not onboarded yet.",
        )

    if payload.new_order_notifications_enabled is not None:
        restaurant.new_order_notifications_enabled = (
            payload.new_order_notifications_enabled
        )

    await db.commit()
    await db.refresh(restaurant)

    return restaurant


@router.delete(
    "/me",
    status_code=status.HTTP_200_OK,
)
async def delete_my_restaurant(
    payload: RestaurantDeleteRequest,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete the authenticated user's restaurant profile."""
    if not payload.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion not confirmed. Set confirm: true to proceed.",
        )

    stmt = select(Restaurant).where(
        Restaurant.owner_id == current_user.id,
        Restaurant.is_deleted == False,
    )
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found.",
        )

    restaurant.is_deleted = True
    restaurant.slug = f"{restaurant.slug}-deleted-{uuid.uuid4().hex[:6]}"
    restaurant.owner_id = None
    await db.commit()

    return {"message": "Restaurant successfully deleted."}


@router.get(
    "/{slug}/qrcode",
    response_model=RestaurantQRCodeResponse,
    status_code=status.HTTP_200_OK,
)
async def get_restaurant_qrcode(
    slug: str,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Generate QR code encoding the restaurant menu URL for the authenticated restaurant owner."""
    stmt = select(Restaurant).where(
        Restaurant.slug == slug,
        Restaurant.is_deleted == False,
    )
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found.",
        )

    if restaurant.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: user does not own this restaurant.",
        )

    base_url = settings.FRONTEND_BASE_URL.rstrip("/")
    menu_url = f"{base_url}/menu/{slug}"

    qr_img = qrcode.make(menu_url)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    qr_code_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return RestaurantQRCodeResponse(
        qr_code_base64=qr_code_base64,
        menu_url=menu_url,
    )

