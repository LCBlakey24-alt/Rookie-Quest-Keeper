"""WebSocket connection manager for real-time campaign sync."""
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set

from fastapi import WebSocket

# ==================== WEBSOCKET REAL-TIME SYNC ====================


class ConnectionManager:
    """Manages WebSocket connections for real-time campaign sync.

    Every socket is tracked on its own. One person often has several open at
    once (the GM screen plus the Player Display window, or a phone and a
    laptop), so closing one must not drop them from the campaign or stop
    direct messages reaching their other screens.
    """

    def __init__(self):
        # campaign_id -> {socket: user_id}
        self.campaign_sockets: Dict[str, Dict[WebSocket, str]] = {}
        # user_id -> every open socket for that user, across campaigns
        self.user_sockets: Dict[str, Set[WebSocket]] = {}
        # socket -> its authorised session (utils.ws_session.SocketSession),
        # so revocation can find and end exactly the affected sockets.
        self.sessions: Dict[WebSocket, Any] = {}

    def track_session(self, websocket: WebSocket, session: Any) -> None:
        self.sessions[websocket] = session

    # Older code and tests read these names; keep them as live views.
    @property
    def campaign_connections(self) -> Dict[str, Set[WebSocket]]:
        return {campaign_id: set(sockets) for campaign_id, sockets in self.campaign_sockets.items()}

    @property
    def campaign_users(self) -> Dict[str, Set[str]]:
        return {campaign_id: set(sockets.values()) for campaign_id, sockets in self.campaign_sockets.items()}

    async def connect(self, websocket: WebSocket, user_id: str, campaign_id: str = None):
        await websocket.accept()
        self.user_sockets.setdefault(user_id, set()).add(websocket)

        if campaign_id:
            already_here = user_id in self.get_campaign_users(campaign_id)
            self.campaign_sockets.setdefault(campaign_id, {})[websocket] = user_id
            if not already_here:
                await self.broadcast_to_campaign(campaign_id, {
                    "type": "user_joined",
                    "user_id": user_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, exclude=websocket)

    def disconnect(self, websocket: WebSocket, user_id: str, campaign_id: str = None) -> bool:
        """Forget one socket. Returns True when the user has left the campaign entirely."""
        self.sessions.pop(websocket, None)
        sockets = self.user_sockets.get(user_id)
        if sockets is not None:
            sockets.discard(websocket)
            if not sockets:
                del self.user_sockets[user_id]

        if not campaign_id or campaign_id not in self.campaign_sockets:
            return False
        members = self.campaign_sockets[campaign_id]
        members.pop(websocket, None)
        if not members:
            del self.campaign_sockets[campaign_id]
            return True
        return user_id not in members.values()

    def _drop_dead(self, websocket: WebSocket) -> None:
        for campaign_id in list(self.campaign_sockets):
            user_id = self.campaign_sockets[campaign_id].get(websocket)
            if user_id is not None:
                self.disconnect(websocket, user_id, campaign_id)
        for user_id in list(self.user_sockets):
            if websocket in self.user_sockets[user_id]:
                self.disconnect(websocket, user_id)

    async def broadcast_to_campaign(self, campaign_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast message to all connections in a campaign"""
        dead = []
        for connection in list(self.campaign_sockets.get(campaign_id, {})):
            if connection == exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for connection in dead:
            self._drop_dead(connection)

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to every open socket for a specific user"""
        dead = []
        for connection in list(self.user_sockets.get(user_id, ())):
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for connection in dead:
            self._drop_dead(connection)

    async def revoke_user(self, user_id: str, code: int, reason: str,
                          campaign_id: Optional[str] = None) -> int:
        """Close every socket this process holds for a user (optionally one campaign).

        Used when a password change/reset retires the user's tokens or the GM
        removes them from a campaign. The socket is forgotten before it is
        closed, so nothing more is delivered to it. Sockets held by other
        processes are ended by their own periodic recheck. Returns how many
        sockets were closed.
        """
        targets = [
            (socket, session) for socket, session in list(self.sessions.items())
            if getattr(session, 'username', None) == user_id
            and (campaign_id is None or getattr(session, 'campaign_id', None) == campaign_id)
        ]
        for socket, session in targets:
            session.revoked = True
            self.disconnect(socket, user_id, getattr(session, 'campaign_id', None))
            try:
                await socket.close(code=code, reason=reason)
            except Exception:
                pass
        return len(targets)

    def get_campaign_users(self, campaign_id: str) -> Set[str]:
        """Get list of connected users in a campaign"""
        return set(self.campaign_sockets.get(campaign_id, {}).values())


ws_manager = ConnectionManager()
