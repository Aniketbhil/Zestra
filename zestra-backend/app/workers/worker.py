from typing import Any

from arq.connections import RedisSettings

from app.core.config import settings
from app.workers.tasks import check_low_stock_cron, notify_order_placed, send_otp_job


async def startup(ctx: dict[str, Any]) -> None:
    pass


async def shutdown(ctx: dict[str, Any]) -> None:
    pass


class WorkerSettings:
    functions: list = [notify_order_placed, send_otp_job]
    cron_jobs: list = [check_low_stock_cron]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)



