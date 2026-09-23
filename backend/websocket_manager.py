from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, tank_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active[tank_id.upper()].append(websocket)

    def disconnect(self, tank_id: str, websocket: WebSocket):
        connections = self.active.get(tank_id.upper(), [])
        if websocket in connections:
            connections.remove(websocket)

    async def broadcast(self, tank_id: str, message: dict):
        stale = []
        for connection in self.active.get(tank_id.upper(), []).copy():
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(tank_id, connection)


manager = ConnectionManager()
