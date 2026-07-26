from datetime import datetime, timezone
import logging
from typing import Any

from arq import cron

logger = logging.getLogger(__name__)


async def notify_order_placed(ctx: dict[str, Any], order_id: Any) -> None:
    logger.info(f"Order {order_id} confirmed")


async def check_low_stock(ctx: dict[str, Any]) -> None:
    timestamp = datetime.now(timezone.utc).isoformat()
    logger.info(f"low stock check ran at {timestamp}")


check_low_stock_cron = cron(
    check_low_stock,
    minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55},
    second=0,
)
