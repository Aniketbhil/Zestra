from unittest.mock import AsyncMock, MagicMock
from fastapi import WebSocket
import pytest

from app.services.connection_manager import ConnectionManager


@pytest.mark.asyncio
async def test_connection_manager_connect():
    cm = ConnectionManager()
    mock_ws = MagicMock(spec=WebSocket)
    mock_ws.accept = AsyncMock()

    await cm.connect("restaurant-a", mock_ws)

    mock_ws.accept.assert_called_once()
    assert "restaurant-a" in cm.active_connections
    assert cm.active_connections["restaurant-a"] == [mock_ws]


@pytest.mark.asyncio
async def test_connection_manager_disconnect():
    cm = ConnectionManager()
    mock_ws1 = MagicMock(spec=WebSocket)
    mock_ws1.accept = AsyncMock()
    mock_ws2 = MagicMock(spec=WebSocket)
    mock_ws2.accept = AsyncMock()

    await cm.connect("restaurant-a", mock_ws1)
    await cm.connect("restaurant-a", mock_ws2)

    assert len(cm.active_connections["restaurant-a"]) == 2

    # Disconnect first socket
    cm.disconnect("restaurant-a", mock_ws1)
    assert cm.active_connections["restaurant-a"] == [mock_ws2]

    # Disconnect second socket
    cm.disconnect("restaurant-a", mock_ws2)
    assert "restaurant-a" not in cm.active_connections


@pytest.mark.asyncio
async def test_connection_manager_broadcast_success():
    cm = ConnectionManager()
    ws1 = MagicMock(spec=WebSocket)
    ws1.accept = AsyncMock()
    ws1.send_json = AsyncMock()

    ws2 = MagicMock(spec=WebSocket)
    ws2.accept = AsyncMock()
    ws2.send_json = AsyncMock()

    await cm.connect("slug-x", ws1)
    await cm.connect("slug-x", ws2)

    msg = {"event": "order_created", "order_id": "123"}
    await cm.broadcast("slug-x", msg)

    ws1.send_json.assert_called_once_with(msg)
    ws2.send_json.assert_called_once_with(msg)
    assert len(cm.active_connections["slug-x"]) == 2


@pytest.mark.asyncio
async def test_connection_manager_broadcast_removes_dead_connection():
    cm = ConnectionManager()
    live_ws = MagicMock(spec=WebSocket)
    live_ws.accept = AsyncMock()
    live_ws.send_json = AsyncMock()

    dead_ws = MagicMock(spec=WebSocket)
    dead_ws.accept = AsyncMock()
    dead_ws.send_json = AsyncMock(side_effect=RuntimeError("Connection closed"))

    await cm.connect("slug-y", live_ws)
    await cm.connect("slug-y", dead_ws)

    msg = {"type": "ping"}
    await cm.broadcast("slug-y", msg)

    live_ws.send_json.assert_called_once_with(msg)
    dead_ws.send_json.assert_called_once_with(msg)

    # Verify dead_ws was silently removed from active connections
    assert cm.active_connections["slug-y"] == [live_ws]
