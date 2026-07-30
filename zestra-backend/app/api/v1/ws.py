from uuid import UUID
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.order import Order
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
    await manager.connect(slug, websocket, channel="menu")

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
        manager.disconnect(slug, websocket, channel="menu")


@router.websocket("/ws/orders/{slug}")
async def websocket_orders_endpoint(
    websocket: WebSocket,
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """WebSocket endpoint for real-time order notifications for restaurant staff by slug."""
    await manager.connect(slug, websocket, channel="orders")

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
        manager.disconnect(slug, websocket, channel="orders")


@router.websocket("/ws/orders/track/{order_id}")
async def websocket_order_track_endpoint(
    websocket: WebSocket,
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """WebSocket endpoint for customer order tracking by order_id.

    No auth required — order_id acts as access token.
    On connection, immediately sends the current order status.
    Registers connection under channel key order:{order_id}.
    """
    await manager.connect(str(order_id), websocket, channel="order")

    try:
        # Validate order exists in DB
        stmt = select(Order.id, Order.status).where(Order.id == order_id)
        res = await db.execute(stmt)
        order_row = res.first()

        if order_row is None:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Order not found",
            )
            return

        current_status = order_row.status.value

        # Immediately send current order status on connection
        await websocket.send_json(
            {
                "type": "order_status",
                "order_id": str(order_id),
                "status": current_status,
            }
        )

        # Keep connection open in a receive loop until client disconnects
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(str(order_id), websocket, channel="order")


@router.websocket("/ws/alerts/{slug}")
async def websocket_alerts_endpoint(
    websocket: WebSocket,
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """WebSocket endpoint for real-time low-stock alerts for restaurant staff by slug."""
    await manager.connect(slug, websocket, channel="alerts")

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
        manager.disconnect(slug, websocket, channel="alerts")


@router.websocket("/ws/tables/{slug}")
async def websocket_tables_endpoint(
    websocket: WebSocket,
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """WebSocket endpoint for real-time table availability notifications by restaurant slug."""
    await manager.connect(slug, websocket, channel="tables")

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
        manager.disconnect(slug, websocket, channel="tables")


