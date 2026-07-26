from collections.abc import AsyncGenerator
from fastapi import Request
from arq import ArqRedis
from redis.asyncio import Redis, from_url

from app.core.config import settings

redis_client: Redis = from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    ssl_cert_reqs=None,
)


async def get_redis() -> AsyncGenerator[Redis, None]:
    yield redis_client


async def get_arq_pool(request: Request) -> ArqRedis | None:
    return getattr(request.app.state, "redis_pool", None) or getattr(
        request.app.state, "arq_pool", None
    )
