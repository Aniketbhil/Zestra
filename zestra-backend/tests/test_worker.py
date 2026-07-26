import pytest
from app.workers.tasks import check_low_stock, check_low_stock_cron, notify_order_placed
from app.workers.worker import WorkerSettings


def test_worker_settings_redis():
    assert WorkerSettings.redis_settings is not None
    assert WorkerSettings.redis_settings.ssl is True
    assert notify_order_placed in WorkerSettings.functions
    assert check_low_stock_cron in WorkerSettings.cron_jobs


@pytest.mark.asyncio
async def test_notify_order_placed_task(caplog):
    with caplog.at_level("INFO"):
        await notify_order_placed({}, "test-order-id-123")
    assert "Order test-order-id-123 confirmed" in caplog.text


@pytest.mark.asyncio
async def test_check_low_stock_task(caplog):
    with caplog.at_level("INFO"):
        await check_low_stock({})
    assert "low stock check ran at" in caplog.text


