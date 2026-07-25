from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections for restaurant real-time order notifications."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, slug: str, websocket: WebSocket) -> None:
        """Accept an incoming WebSocket connection and register it under the given restaurant slug."""
        await websocket.accept()
        if slug not in self.active_connections:
            self.active_connections[slug] = []
        self.active_connections[slug].append(websocket)

    def disconnect(self, slug: str, websocket: WebSocket) -> None:
        """Remove a WebSocket connection from the registered restaurant slug list."""
        if slug in self.active_connections:
            if websocket in self.active_connections[slug]:
                self.active_connections[slug].remove(websocket)
            if not self.active_connections[slug]:
                del self.active_connections[slug]

    async def broadcast(self, slug: str, message: dict) -> None:
        """Broadcast a JSON message to all active WebSocket connections for a restaurant slug, silently removing dead connections."""
        if slug not in self.active_connections:
            return

        dead_connections: list[WebSocket] = []
        for connection in list(self.active_connections[slug]):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(slug, dead)


manager = ConnectionManager()
