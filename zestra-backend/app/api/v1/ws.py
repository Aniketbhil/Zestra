from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.restaurant import Restaurant
from app.services.connection_manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/menu/{slug}")
async def websocket_menu_endpoint(
    websocket: WebSocket,
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """WebSocket endpoint for real-time menu notifications by restaurant slug."""
    await manager.connect(slug, websocket)

    try:
        # Validate restaurant slug exists in DB
        stmt = select(Restaurant.id).where(Restaurant.slug == slug)
        res = await db.execute(stmt)
        if res.scalar_one_or_none() is None:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Restaurant slug not found",
            )
            return

        # Keep connection open in a receive loop until client disconnects
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(slug, websocket)
