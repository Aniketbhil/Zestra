from datetime import datetime, timezone
import logging
from typing import Any

from arq import cron
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.inventory_item import InventoryItem
from app.models.restaurant import Restaurant
from app.services.connection_manager import manager
from app.services.email import send_otp_email
from app.services.sms import send_otp_sms

logger = logging.getLogger(__name__)


async def notify_order_placed(ctx: dict[str, Any], order_id: Any) -> None:
    logger.info(f"Order {order_id} confirmed")


async def send_otp_job(
    ctx: dict[str, Any],
    email: str,
    otp: str,
    phone_number: str | None = None,
) -> None:
    """Background task to send OTP email and optional OTP SMS."""
    try:
        await send_otp_email(email, otp)
    except Exception as e:
        logger.error(f"Error in send_otp_email task for {email}: {e}")

    if phone_number:
        try:
            await send_otp_sms(phone_number, otp)
        except Exception as e:
            logger.error(f"Error in send_otp_sms task for {phone_number}: {e}")



async def check_low_stock(ctx: dict[str, Any]) -> None:
    """Query low stock inventory items (quantity <= low_stock_threshold) and broadcast alerts to WS channel."""
    timestamp = datetime.now(timezone.utc).isoformat()
    logger.info(f"low stock check ran at {timestamp}")

    async with AsyncSessionLocal() as db:
        stmt = (
            select(InventoryItem, Restaurant.slug)
            .join(Restaurant, InventoryItem.restaurant_id == Restaurant.id)
            .where(InventoryItem.quantity <= InventoryItem.low_stock_threshold)
        )
        res = await db.execute(stmt)
        low_stock_rows = res.all()

        for item, slug in low_stock_rows:
            await manager.broadcast(
                f"alerts:{slug}",
                {
                    "type": "low_stock_alert",
                    "inventory_item_id": str(item.id),
                    "name": item.name,
                    "quantity": float(item.quantity),
                },
            )


check_low_stock_cron = cron(
    check_low_stock,
    minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55},
    second=0,
)
