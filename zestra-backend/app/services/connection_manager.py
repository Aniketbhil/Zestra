from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections for restaurant real-time notifications with namespaced channels."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    def _get_channel_key(self, slug: str, channel: str | None = None) -> str:
        """Format the channel key with namespace prefix if provided, e.g., 'orders:pizza-palace' or 'menu:pizza-palace'."""
        if channel:
            if slug.startswith(f"{channel}:"):
                return slug
            return f"{channel}:{slug}"
        return slug

    async def connect(
        self, slug: str, websocket: WebSocket, channel: str | None = None
    ) -> None:
        """Accept an incoming WebSocket connection and register it under the given channel namespace and restaurant slug."""
        await websocket.accept()
        key = self._get_channel_key(slug, channel)
        if key not in self.active_connections:
            self.active_connections[key] = []
        self.active_connections[key].append(websocket)

    def disconnect(
        self, slug: str, websocket: WebSocket, channel: str | None = None
    ) -> None:
        """Remove a WebSocket connection from the registered channel namespace."""
        key = self._get_channel_key(slug, channel)
        if key in self.active_connections:
            if websocket in self.active_connections[key]:
                self.active_connections[key].remove(websocket)
            if not self.active_connections[key]:
                del self.active_connections[key]

    async def broadcast(
        self, slug: str, message: dict, channel: str | None = None
    ) -> None:
        """Broadcast a JSON message to all active WebSocket connections in a channel namespace."""
        key = self._get_channel_key(slug, channel)
        if key not in self.active_connections:
            return

        dead_connections: list[WebSocket] = []
        for connection in list(self.active_connections[key]):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(slug, dead, channel=channel)


manager = ConnectionManager()
