import pytest
from redis.asyncio import Redis
from app.core.redis import get_redis, redis_client


def test_redis_client_instance():
    assert isinstance(redis_client, Redis)


@pytest.mark.asyncio
async def test_get_redis_dependency():
    async for client in get_redis():
        assert isinstance(client, Redis)
