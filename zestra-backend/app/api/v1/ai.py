from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google import genai
from google.genai import types
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import require_role
from app.core.redis import redis_client
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.ai import AIInsightsResponse
from app.schemas.menu_item import MenuItemResponse

router = APIRouter(prefix="/ai", tags=["AI"])


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


@router.get(
    "/recommendations",
    response_model=list[MenuItemResponse],
    status_code=status.HTTP_200_OK,
)
async def get_recommendations(
    slug: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
):
    """Get AI menu recommendations for an authenticated customer at a restaurant.

    - Looks at past orders on the specified restaurant to identify ordered categories.
    - Recommends available items from those categories that the customer hasn't ordered yet.
    - If no order history exists or no un-ordered category items remain, falls back to top 5 best-selling available items.
    """
    # 1. Fetch restaurant by slug
    stmt_rest = select(Restaurant).where(Restaurant.slug == slug)
    res_rest = await db.execute(stmt_rest)
    restaurant = res_rest.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found.",
        )

    # 2. Query customer's order history at this restaurant
    stmt_history = (
        select(OrderItem.menu_item_id, MenuItem.category)
        .join(Order, OrderItem.order_id == Order.id)
        .join(MenuItem, OrderItem.menu_item_id == MenuItem.id)
        .where(Order.customer_id == current_user.id)
        .where(Order.restaurant_id == restaurant.id)
    )
    res_history = await db.execute(stmt_history)
    history_rows = res_history.all()

    ordered_item_ids = {row.menu_item_id for row in history_rows}
    ordered_categories = {row.category for row in history_rows}

    # 3. Recommend un-ordered items from the same categories if history exists
    if ordered_categories:
        stmt_recs = (
            select(MenuItem)
            .where(MenuItem.restaurant_id == restaurant.id)
            .where(MenuItem.is_available == True)
            .where(MenuItem.category.in_(ordered_categories))
            .where(MenuItem.id.notin_(ordered_item_ids))
        )
        res_recs = await db.execute(stmt_recs)
        recommendations = res_recs.scalars().all()

        if recommendations:
            return recommendations

    # 4. Fallback: Top 5 best-selling available items
    stmt_top = (
        select(MenuItem)
        .join(OrderItem, MenuItem.id == OrderItem.menu_item_id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.restaurant_id == restaurant.id)
        .where(MenuItem.is_available == True)
        .group_by(MenuItem.id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    res_top = await db.execute(stmt_top)
    fallback_items = res_top.scalars().all()

    if not fallback_items:
        stmt_avail = (
            select(MenuItem)
            .where(MenuItem.restaurant_id == restaurant.id)
            .where(MenuItem.is_available == True)
            .limit(5)
        )
        res_avail = await db.execute(stmt_avail)
        fallback_items = res_avail.scalars().all()

    return fallback_items


@router.get(
    "/insights",
    response_model=AIInsightsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_ai_insights(
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.RESTAURANT)),
):
    """Get AI operational insights summary for the authenticated restaurant user's restaurant.

    - Gathers analytics data: total_sales, top_items, orders_by_hour.
    - Checks Redis cache (keyed by restaurant_id, 1-hour TTL).
    - If `refresh=true` query param is provided, bypasses the cache check and forces a fresh LLM call.
    - Invokes Gemini API (gemini-2.0-flash via google-genai SDK) with system prompt for operational summary.
    - Caches result in Redis and returns summary.
    """
    restaurant = await get_user_restaurant(db, current_user.id)
    cache_key = f"ai:insights:{restaurant.id}"

    # 1. Try reading cached insights from Redis unless refresh is requested
    if not refresh:
        try:
            cached_summary = await redis_client.get(cache_key)
            if cached_summary:
                return AIInsightsResponse(summary=cached_summary)
        except Exception:
            pass

    # 2. Gather analytics data (total_sales, top_items, orders_by_hour)
    stmt_sales = select(func.sum(Order.total)).where(
        Order.restaurant_id == restaurant.id
    )
    res_sales = await db.execute(stmt_sales)
    total_sales = res_sales.scalar_one_or_none() or Decimal("0.00")

    stmt_top = (
        select(MenuItem.name, func.sum(OrderItem.quantity).label("count"))
        .join(OrderItem, MenuItem.id == OrderItem.menu_item_id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.restaurant_id == restaurant.id)
        .group_by(MenuItem.id, MenuItem.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    res_top = await db.execute(stmt_top)
    top_items = [
        {"name": name, "count": int(count)} for name, count in res_top.all()
    ]

    stmt_orders = select(Order.created_at).where(
        Order.restaurant_id == restaurant.id
    )
    res_orders = await db.execute(stmt_orders)
    created_ats = res_orders.scalars().all()

    orders_by_hour = {h: 0 for h in range(24)}
    for created_at in created_ats:
        orders_by_hour[created_at.hour] += 1

    # 3. Call Gemini API via google-genai SDK if key present
    summary = ""
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key":
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt_data = (
                f"Restaurant: {restaurant.name}\n"
                f"Total Sales: ${total_sales:.2f}\n"
                f"Top Selling Items: {top_items}\n"
                f"Order Distribution by Hour (0-23): {orders_by_hour}"
            )
            system_instruction = (
                "You are an expert restaurant operations advisor. "
                "Provide a short 2-3 sentence plain-English operational summary based on the provided sales, top items, and hourly order data. "
                "Focus on actionable operational insights."
            )
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt_data,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                ),
            )
            if response and response.text:
                summary = response.text.strip()
        except Exception:
            summary = ""

    # Fallback if Gemini API key is missing or call fails
    if not summary:
        top_str = (
            ", ".join(f"{item['name']} ({item['count']} sold)" for item in top_items[:3])
            if top_items
            else "No items sold yet"
        )
        peak_hour = (
            max(orders_by_hour, key=orders_by_hour.get)
            if sum(orders_by_hour.values()) > 0
            else None
        )
        peak_str = f" Order volume peaked around {peak_hour}:00." if peak_hour is not None else ""
        summary = (
            f"Total sales stand at ${total_sales:.2f} with top performers being {top_str}.{peak_str} "
            "Consider optimizing inventory and staffing to align with peak demand periods."
        )

    # 4. Cache in Redis with 1-hour TTL (3600 seconds)
    try:
        await redis_client.set(cache_key, summary, ex=3600)
    except Exception:
        pass

    return AIInsightsResponse(summary=summary)
