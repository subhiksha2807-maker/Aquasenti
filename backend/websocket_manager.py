"""Tank-scoped WebSocket connection registry."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, tank_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[tank_id].add(websocket)

    def disconnect(self, tank_id: str, websocket: WebSocket) -> None:
        self.connections[tank_id].discard(websocket)
        if not self.connections[tank_id]:
            self.connections.pop(tank_id, None)

    async def broadcast(self, tank_id: str, message: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for websocket in tuple(self.connections.get(tank_id, ())):
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(tank_id, websocket)


manager = WebSocketManager()
