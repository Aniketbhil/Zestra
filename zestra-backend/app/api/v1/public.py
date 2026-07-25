from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.restaurant import Restaurant
from app.schemas.menu_item import (
    PublicMenuCategoryResponse,
    PublicMenuItemResponse,
    PublicMenuResponse,
)

router = APIRouter(prefix="/public", tags=["Public"])


@router.get(
    "/menu/{slug}",
    response_model=PublicMenuResponse,
    status_code=status.HTTP_200_OK,
)
async def get_public_menu(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch public restaurant menu by restaurant slug without authentication."""
    stmt = select(Restaurant).where(Restaurant.slug == slug)
    res = await db.execute(stmt)
    restaurant = res.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found.",
        )

    items_stmt = (
        select(MenuItem)
        .where(MenuItem.restaurant_id == restaurant.id)
        .order_by(MenuItem.category.asc(), MenuItem.created_at.asc())
    )
    items_res = await db.execute(items_stmt)
    menu_items = items_res.scalars().all()

    grouped_categories: dict[str, list[PublicMenuItemResponse]] = {}
    for item in menu_items:
        cat = item.category
        if cat not in grouped_categories:
            grouped_categories[cat] = []
        grouped_categories[cat].append(PublicMenuItemResponse.model_validate(item))

    categories_list = [
        PublicMenuCategoryResponse(category=cat, items=items)
        for cat, items in grouped_categories.items()
    ]

    return PublicMenuResponse(
        name=restaurant.name,
        categories=categories_list,
    )
