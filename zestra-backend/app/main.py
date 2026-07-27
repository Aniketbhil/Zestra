import asyncio
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from arq import create_pool
from arq.connections import RedisSettings
from arq.worker import create_worker

from app.api.v1 import api_router
from app.api.v1.ws import router as ws_router
from app.core.config import settings
from app.workers.worker import WorkerSettings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    worker = None
    worker_task = None
    try:
        app.state.redis_pool = await create_pool(
            RedisSettings.from_dsn(settings.REDIS_URL)
        )
        app.state.arq_pool = app.state.redis_pool

        # Start in-process arq worker as a background asyncio task
        worker = create_worker(WorkerSettings)
        worker_task = asyncio.create_task(worker.async_run())
        app.state.arq_worker = worker
        app.state.arq_worker_task = worker_task
    except Exception as e:
        logger.warning(f"Failed to initialize Redis or ARQ worker: {e}")
        app.state.redis_pool = None
        app.state.arq_pool = None
        app.state.arq_worker = None
        app.state.arq_worker_task = None

    yield

    if worker_task and not worker_task.done():
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass

    if worker:
        try:
            await worker.close()
        except Exception:
            pass

    if getattr(app.state, "redis_pool", None):
        await app.state.redis_pool.aclose()


app = FastAPI(
    title="Zestra Backend",
    version="0.1.0",
    lifespan=lifespan,
)

frontend_origin = settings.FRONTEND_BASE_URL.rstrip("/")

origins = list(
    {
        frontend_origin,
        f"{frontend_origin}/",
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3000/",
        "http://localhost:5173/",
        "http://localhost:8000",
        "https://localhost:8000",
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(ws_router)
app.include_router(api_router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}
