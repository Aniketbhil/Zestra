from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.menu import router as menu_router
from app.api.v1.public import router as public_router
from app.api.v1.restaurants import router as restaurants_router
from app.api.v1.ws import router as ws_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(auth_router)
api_router.include_router(restaurants_router)
api_router.include_router(menu_router)
api_router.include_router(public_router)
api_router.include_router(ws_router)


