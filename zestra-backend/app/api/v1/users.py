from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.user import UserProfileResponse, UserProfileUpdate, UserSettingsUpdate

router = APIRouter(prefix="/users", tags=["Users"])


async def fetch_user_restaurant(
    db: AsyncSession, user: User
) -> Restaurant | None:
    """Fetch restaurant owned by user if user role is RESTAURANT."""
    if user.role != UserRole.RESTAURANT:
        return None

    stmt = select(Restaurant).where(Restaurant.owner_id == user.id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


@router.get(
    "/me/profile",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get profile of the authenticated user.

    Returns email, full_name, role, auth_provider, is_active, created_at,
    and nested restaurant info (if restaurant role user with onboarded restaurant).
    """
    restaurant = await fetch_user_restaurant(db, current_user)

    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        auth_provider=current_user.auth_provider,
        is_active=current_user.is_active,
        notifications_enabled=current_user.notifications_enabled,
        created_at=current_user.created_at,
        restaurant=restaurant,
    )


@router.patch(
    "/me/profile",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def update_my_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile of the authenticated user.

    Allows updating editable full_name field. Email is not editable.
    Returns updated user profile.
    """
    if payload.full_name is not None:
        current_user.full_name = payload.full_name

    await db.commit()
    await db.refresh(current_user)

    restaurant = await fetch_user_restaurant(db, current_user)

    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        auth_provider=current_user.auth_provider,
        is_active=current_user.is_active,
        notifications_enabled=current_user.notifications_enabled,
        created_at=current_user.created_at,
        restaurant=restaurant,
    )


@router.patch(
    "/me/settings",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def update_my_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update settings of the authenticated user.

    Supports toggling notifications_enabled preference.
    """
    if payload.notifications_enabled is not None:
        current_user.notifications_enabled = payload.notifications_enabled

    await db.commit()
    await db.refresh(current_user)

    restaurant = await fetch_user_restaurant(db, current_user)

    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        auth_provider=current_user.auth_provider,
        is_active=current_user.is_active,
        notifications_enabled=current_user.notifications_enabled,
        created_at=current_user.created_at,
        restaurant=restaurant,
    )
