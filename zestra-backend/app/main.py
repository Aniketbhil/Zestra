from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import api_router
from app.api.v1.ws import router as ws_router
from app.core.config import settings

app = FastAPI(
    title="Zestra Backend",
    version="0.1.0",
)

frontend_origin = settings.FRONTEND_BASE_URL.rstrip("/")

origins = list(
    {
        frontend_origin,
        f"{frontend_origin}/",
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:3000/",
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

