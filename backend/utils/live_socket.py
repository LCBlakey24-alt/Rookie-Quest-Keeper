"""The live campaign WebSocket endpoint.

Lives outside server.py so it can be exercised over a real socket in tests
without importing every HTTP router. server.py registers it at
/ws/campaign/{campaign_id}. Session policy: utils/ws_session.py.
"""
import asyncio
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect

from config import CORS_ORIGIN_LIST, logger
from utils.ws_manager import ws_manager
from utils.ws_messages import GM_ONLY_MESSAGE_TYPES, is_allowed_client_message_type, parse_client_message
from utils.ws_session import (
    AUTH_DEADLINE_SECONDS,
    CLOSE_FORBIDDEN,
    CLOSE_UNAUTHENTICATED,
    REASON_AUTH_REQUIRED,
    REASON_ORIGIN,
    SocketRejected,
    authorise_campaign_socket,
    first_message_token,
    origin_allowed,
    watch_session,
)


# WebSocket endpoint for real-time campaign sync
async def websocket_campaign_sync(websocket: WebSocket, campaign_id: str):
    """WebSocket endpoint for real-time campaign synchronization.

    Handshake (PR "live socket transport"):
      1. Origin must be one the API already trusts (CORS_ORIGINS), checked
         before the upgrade is accepted -- cross-site WebSocket hijacking.
      2. The socket is accepted, but joins no campaign and is sent nothing.
      3. The first message must be {"type": "auth", "token": ...} within
         AUTH_DEADLINE_SECONDS. A token in the URL is refused outright:
         URLs are written to access logs.
      4. Only then the #772 session policy runs (revocation, deleted
         account, child accounts, campaign membership), the socket is
         registered, and it is kept authorised by `watch_session`.
    """
    if not origin_allowed(websocket.headers.get("origin"), CORS_ORIGIN_LIST):
        await websocket.close(code=CLOSE_FORBIDDEN, reason=REASON_ORIGIN)
        return
    if "token" in websocket.query_params:
        # Old clients put the session token in the URL. It is already in the
        # access log by now; do not also honour it.
        await websocket.close(code=CLOSE_UNAUTHENTICATED, reason=REASON_AUTH_REQUIRED)
        return

    await websocket.accept()
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=AUTH_DEADLINE_SECONDS)
    except (asyncio.TimeoutError, WebSocketDisconnect, RuntimeError):
        try:
            await websocket.close(code=CLOSE_UNAUTHENTICATED, reason=REASON_AUTH_REQUIRED)
        except Exception:
            pass
        return
    token = first_message_token(raw)
    if not token:
        await websocket.close(code=CLOSE_UNAUTHENTICATED, reason=REASON_AUTH_REQUIRED)
        return

    try:
        session = await authorise_campaign_socket(token, campaign_id)
    except SocketRejected as rejection:
        await websocket.close(code=rejection.code, reason=rejection.reason)
        return
    except Exception:
        # Infrastructure failure, not bad credentials. No detail to the client.
        await websocket.close(code=1013, reason="Live play access could not be checked. Reconnecting.")
        return

    username = session.username
    # auth_ok goes first, before the socket can receive any campaign
    # broadcast, so a client never mistakes campaign traffic for the reply.
    await websocket.send_json({"type": "auth_ok"})
    await ws_manager.connect(websocket, username, campaign_id, accept=False)
    ws_manager.track_session(websocket, session)
    watcher = asyncio.create_task(watch_session(websocket, token, session, ws_manager))

    try:
        while True:
            raw = await websocket.receive_text()
            if session.revoked:
                break
            data = parse_client_message(raw)
            if data is None:
                await websocket.send_json({
                    "type": "error",
                    "code": "invalid_message",
                    "message": "Live campaign messages must be JSON objects under 64 KB.",
                })
                continue
            msg_type = data.get("type", "")

            if not is_allowed_client_message_type(msg_type):
                await websocket.send_json({
                    "type": "error",
                    "code": "unsupported_message_type",
                    "message": "Unsupported live campaign message type.",
                })
                continue

            if msg_type in GM_ONLY_MESSAGE_TYPES and not session.is_gm:
                await websocket.send_json({
                    "type": "error",
                    "code": "gm_only",
                    "message": "Only the GM can change the shared map or initiative.",
                })
                continue

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg_type == "cursor_move":
                await ws_manager.broadcast_to_campaign(campaign_id, {
                    "type": "cursor_update",
                    "user_id": username,
                    "position": data.get("position", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, exclude=websocket)
            elif msg_type == "map_update":
                await ws_manager.broadcast_to_campaign(campaign_id, {
                    "type": "map_update",
                    "user_id": username,
                    "data": data.get("data", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, exclude=websocket)
            elif msg_type == "initiative_update":
                await ws_manager.broadcast_to_campaign(campaign_id, {
                    "type": "initiative_update",
                    "user_id": username,
                    "data": data.get("data", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, exclude=websocket)
            elif msg_type == "chat_message":
                await ws_manager.broadcast_to_campaign(campaign_id, {
                    "type": "chat_message",
                    "user_id": username,
                    "message": data.get("message", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, exclude=websocket)
            elif msg_type == "dice_roll":
                await ws_manager.broadcast_to_campaign(campaign_id, {
                    "type": "dice_roll",
                    "user_id": username,
                    "roll": data.get("roll", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, exclude=websocket)
            elif msg_type == "get_users":
                users = ws_manager.get_campaign_users(campaign_id)
                await websocket.send_json({
                    "type": "user_list",
                    "users": list(users)
                })

    except WebSocketDisconnect:
        pass
    except RuntimeError:
        # Receiving on a socket the watcher has just closed.
        pass
    except Exception as e:
        # Type only: exception text can carry request details.
        logger.error("WebSocket error: %s", type(e).__name__)
    finally:
        watcher.cancel()
        try:
            await watcher
        except (asyncio.CancelledError, Exception):
            pass
        # Only announce a departure when this was the person's last open
        # screen in the campaign (the GM often has two windows open).
        if ws_manager.disconnect(websocket, username, campaign_id):
            await ws_manager.broadcast_to_campaign(campaign_id, {
                "type": "user_left",
                "user_id": username,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
