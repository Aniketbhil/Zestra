from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.menu_item import MenuItemCreate, MenuItemResponse, MenuItemUpdate
from app.services.connection_manager import manager

router = APIRouter(prefix="/menu", tags=["Menu"])



async def get_user_restaurant(db: AsyncSession, user_id: UUID) -> Restaurant:
    """Fetch the restaurant belonging to the current user, or raise 400 Bad Request if not onboarded."""
    stmt = select(Restaurant).where(Restaurant.owner_id == user_id)
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete restaurant onboarding first.",
        )

    return restaurant


@router.post(
    "",
    response_model=MenuItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_menu_item(
    payload: MenuItemCreate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new menu item for the authenticated restaurant user's restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    item = MenuItem(
        restaurant_id=restaurant.id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        category=payload.category,
        image_url=payload.image_url,
        is_available=payload.is_available,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return item


@router.get(
    "",
    response_model=list[MenuItemResponse],
    status_code=status.HTTP_200_OK,
)
async def list_menu_items(
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """List all menu items belonging to the authenticated restaurant user's restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = (
        select(MenuItem)
        .where(MenuItem.restaurant_id == restaurant.id)
        .order_by(MenuItem.created_at.desc())
    )
    res = await db.execute(stmt)
    items = res.scalars().all()

    return items


@router.patch(
    "/{item_id}",
    response_model=MenuItemResponse,
    status_code=status.HTTP_200_OK,
)
async def update_menu_item(
    item_id: UUID,
    payload: MenuItemUpdate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Update a menu item belonging to the current restaurant. Returns 404 if item does not exist or belong to another restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = select(MenuItem).where(
        MenuItem.id == item_id,
        MenuItem.restaurant_id == restaurant.id,
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    is_available_changed = (
        "is_available" in update_data
        and update_data["is_available"] != item.is_available
    )

    for field, value in update_data.items():
        setattr(item, field, value)

    db.add(item)
    await db.commit()
    await db.refresh(item)

    if is_available_changed:
        await manager.broadcast(
            restaurant.slug,
            {
                "type": "availability_update",
                "item_id": str(item.id),
                "is_available": item.is_available,
            },
        )

    return item



@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_menu_item(
    item_id: UUID,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a menu item belonging to the current restaurant. Returns 404 if item does not exist or belong to another restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = select(MenuItem).where(
        MenuItem.id == item_id,
        MenuItem.restaurant_id == restaurant.id,
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found.",
        )

    await db.delete(item)
    await db.commit()

    return None
