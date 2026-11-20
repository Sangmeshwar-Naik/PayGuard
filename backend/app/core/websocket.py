"""
PayGuard WebSocket Streaming Connection Manager
Manages real-time client connections and broadcasts live fraud events.
"""

from typing import List, Dict, Any
from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send handshake welcome message
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to PayGuard Real-Time Fraud Event Feed",
            "active_clients": len(self.active_connections),
        })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: Any):
        payload = {"type": event_type, "data": data}
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception:
                disconnected.append(connection)
        for dead_conn in disconnected:
            self.disconnect(dead_conn)

    async def broadcast_new_transaction(self, tx_dict: Dict[str, Any]):
        await self.broadcast("NEW_TRANSACTION", tx_dict)

    async def broadcast_transaction_updated(self, tx_dict: Dict[str, Any]):
        await self.broadcast("TRANSACTION_UPDATED", tx_dict)

    async def broadcast_audit_log(self, audit_dict: Dict[str, Any]):
        await self.broadcast("AUDIT_LOG_CREATED", audit_dict)


ws_manager = ConnectionManager()
