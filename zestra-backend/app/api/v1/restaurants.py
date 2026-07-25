from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.restaurant import RestaurantCreate, RestaurantResponse
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
    # Check if current user already has a restaurant profile (1:1 constraint)
    existing_stmt = select(Restaurant.id).where(
        Restaurant.owner_id == current_user.id
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
    )
    db.add(restaurant)
    await db.commit()
    await db.refresh(restaurant)

    return restaurant
