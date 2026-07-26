import pytest
from unittest.mock import MagicMock
from redis.asyncio import Redis

from app.core.redis import get_arq_pool, get_redis, redis_client
from app.main import lifespan, app


def test_redis_client_instance():
    assert isinstance(redis_client, Redis)


@pytest.mark.asyncio
async def test_get_redis_dependency():
    async for client in get_redis():
        assert isinstance(client, Redis)


@pytest.mark.asyncio
async def test_get_arq_pool_dependency():
    mock_request = MagicMock()
    mock_request.app.state.redis_pool = "mock_pool"
    pool = await get_arq_pool(mock_request)
    assert pool == "mock_pool"


@pytest.mark.asyncio
async def test_lifespan_redis_pool():
    async with lifespan(app):
        # Even if connection fails in test env without Redis, app.state.redis_pool attribute exists
        assert hasattr(app.state, "redis_pool")

