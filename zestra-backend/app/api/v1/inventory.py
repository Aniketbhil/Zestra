from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.inventory_item import InventoryItem
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.inventory_item import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


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
    response_model=InventoryItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_inventory_item(
    payload: InventoryItemCreate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new inventory item for the authenticated restaurant user's restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    item = InventoryItem(
        restaurant_id=restaurant.id,
        name=payload.name,
        quantity=payload.quantity,
        unit=payload.unit,
        low_stock_threshold=payload.low_stock_threshold,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return item


@router.get(
    "",
    response_model=list[InventoryItemResponse],
    status_code=status.HTTP_200_OK,
)
async def list_inventory_items(
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """List all inventory items belonging to the authenticated restaurant user's restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = (
        select(InventoryItem)
        .where(InventoryItem.restaurant_id == restaurant.id)
        .order_by(InventoryItem.created_at.desc())
    )
    res = await db.execute(stmt)
    items = res.scalars().all()

    return items


@router.get(
    "/{item_id}",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_200_OK,
)
async def get_inventory_item(
    item_id: UUID,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Get an inventory item belonging to the current restaurant. Returns 404 if item does not exist or belongs to another restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = select(InventoryItem).where(
        InventoryItem.id == item_id,
        InventoryItem.restaurant_id == restaurant.id,
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    return item


@router.patch(
    "/{item_id}",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_200_OK,
)
@router.put(
    "/{item_id}",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_200_OK,
)
async def update_inventory_item(
    item_id: UUID,
    payload: InventoryItemUpdate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Update an inventory item belonging to the current restaurant. Returns 404 if item does not exist or belongs to another restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = select(InventoryItem).where(
        InventoryItem.id == item_id,
        InventoryItem.restaurant_id == restaurant.id,
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.add(item)
    await db.commit()
    await db.refresh(item)

    return item


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_inventory_item(
    item_id: UUID,
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
    db: AsyncSession = Depends(get_db),
):
    """Delete an inventory item belonging to the current restaurant. Returns 404 if item does not exist or belongs to another restaurant."""
    restaurant = await get_user_restaurant(db, current_user.id)

    stmt = select(InventoryItem).where(
        InventoryItem.id == item_id,
        InventoryItem.restaurant_id == restaurant.id,
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found.",
        )

    await db.delete(item)
    await db.commit()

    return None
