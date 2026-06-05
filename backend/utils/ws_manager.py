"""WebSocket connection manager for real-time campaign sync."""
from datetime import datetime, timezone
from typing import Dict, Set
from fastapi import WebSocket

# ==================== WEBSOCKET REAL-TIME SYNC ====================

class ConnectionManager:
    """Manages WebSocket connections for real-time campaign sync"""
    def __init__(self):
        # Maps campaign_id -> set of WebSocket connections
        self.campaign_connections: Dict[str, Set[WebSocket]] = {}
        # Maps user_id -> WebSocket for direct messages
        self.user_connections: Dict[str, WebSocket] = {}
        # Maps campaign_id -> set of connected user_ids
        self.campaign_users: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, campaign_id: str = None):
        await websocket.accept()
        self.user_connections[user_id] = websocket
        
        if campaign_id:
            if campaign_id not in self.campaign_connections:
                self.campaign_connections[campaign_id] = set()
                self.campaign_users[campaign_id] = set()
            self.campaign_connections[campaign_id].add(websocket)
            self.campaign_users[campaign_id].add(user_id)
            
            # Notify others in campaign
            await self.broadcast_to_campaign(campaign_id, {
                "type": "user_joined",
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, exclude=websocket)

    def disconnect(self, websocket: WebSocket, user_id: str, campaign_id: str = None):
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        
        if campaign_id:
            if campaign_id in self.campaign_connections:
                self.campaign_connections[campaign_id].discard(websocket)
            if campaign_id in self.campaign_users:
                self.campaign_users[campaign_id].discard(user_id)

    async def broadcast_to_campaign(self, campaign_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast message to all connections in a campaign"""
        if campaign_id not in self.campaign_connections:
            return
        dead: set = set()
        for connection in self.campaign_connections[campaign_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                dead.add(connection)
        if dead:
            self.campaign_connections[campaign_id] -= dead

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to a specific user"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
            except Exception:
                pass

    def get_campaign_users(self, campaign_id: str) -> Set[str]:
        """Get list of connected users in a campaign"""
        return self.campaign_users.get(campaign_id, set())

ws_manager = ConnectionManager()

