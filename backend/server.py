"""
ROOK Backend - Rookie Quest Keeper
Thin entry point that assembles all modular routers.
"""
from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware
import logging

from config import client, logger, CORS_ORIGIN_LIST
from utils.ws_manager import ws_manager
from utils.auth import verify_token, verify_campaign_membership
from utils.rate_limit import RateLimitMiddleware
from routes import all_routers
from routes.rule_systems import initialize_rule_systems

from datetime import datetime, timezone

# Create the main app
app = FastAPI()

# Lightweight route-based protection for auth, AI, and parsing endpoints.
app.add_middleware(RateLimitMiddleware)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Include all domain routers
for router in all_routers:
    api_router.include_router(router)

# Include the combined api_router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGIN_LIST,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoints
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint for deployment readiness"""
    return {"status": "healthy", "service": "rook-backend"}


# WebSocket endpoint for real-time campaign sync
@app.websocket("/ws/campaign/{campaign_id}")
async def websocket_campaign_sync(websocket: WebSocket, campaign_id: str):
    """WebSocket endpoint for real-time campaign synchronization"""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    try:
        username = verify_token(token)
        await verify_campaign_membership(campaign_id, username)
    except Exception:
        await websocket.close(code=4001, reason="Invalid token or campaign access denied")
        return

    await ws_manager.connect(websocket, username, campaign_id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

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
            else:
                await ws_manager.broadcast_to_campaign(campaign_id, {
                    "type": msg_type,
                    "user_id": username,
                    "data": data,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, exclude=websocket)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, username, campaign_id)
        await ws_manager.broadcast_to_campaign(campaign_id, {
            "type": "user_left",
            "user_id": username,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket, username, campaign_id)


@app.on_event("startup")
async def startup_event():
    """Initialize systems on startup"""
    await initialize_rule_systems()
    logger.info("Rule systems initialized")

    # Seed premade character templates into MongoDB if missing.
    try:
        from routes.character_templates import seed_templates_if_empty
        await seed_templates_if_empty()
    except Exception as e:
        logger.warning(f"Could not seed character templates: {e}")

    # Ensure indexes exist for the most queried fields.
    # create_index is a no-op if the index already exists.
    try:
        from pymongo import ASCENDING
        existing_user_indexes = await db.users.index_information()
        email_index = existing_user_indexes.get("email_1")
        if email_index and not email_index.get("partialFilterExpression"):
            await db.users.drop_index("email_1")
        await db.users.create_index(
            [("email", ASCENDING)],
            unique=True,
            background=True,
            partialFilterExpression={"email": {"$exists": True, "$type": "string"}},
        )
        await db.users.create_index([("username", ASCENDING)], unique=True, background=True)
        await db.campaigns.create_index([("dm_user_id", ASCENDING)], background=True)
        await db.campaigns.create_index([("user_id", ASCENDING)], background=True)
        await db.player_characters.create_index([("user_id", ASCENDING)], background=True)
        await db.player_characters.create_index([("campaign_id", ASCENDING)], background=True)
        await db.campaign_members.create_index([("campaign_id", ASCENDING)], background=True)
        await db.campaign_members.create_index([("user_id", ASCENDING)], background=True)
        for col_name in ("npcs", "notes", "ingame_notes", "locations", "maps", "world_maps",
                         "local_maps", "combat_encounters", "combat_sessions", "inventory",
                         "party_currency", "custom_items", "campaign_events", "location_economy",
                         "handouts", "session_recaps", "calendar_events"):
            col = getattr(db, col_name)
            await col.create_index([("campaign_id", ASCENDING)], background=True)
        await db.ai_usage.create_index([("username", ASCENDING), ("month", ASCENDING)], background=True)
        await db.user_playtest_packs.create_index([("user_id", ASCENDING), ("edition", ASCENDING)], background=True)
        await db.user_playtest_packs.create_index([("campaign_id", ASCENDING)], background=True)
        await db.user_playtest_content.create_index([("user_id", ASCENDING), ("edition", ASCENDING), ("content_type", ASCENDING)], background=True)
        await db.user_playtest_content.create_index([("pack_id", ASCENDING)], background=True)
        await db.user_playtest_content.create_index([("campaign_id", ASCENDING)], background=True)
        await db.password_resets.create_index([("token", ASCENDING)], background=True)
        await db.password_resets.create_index([("email", ASCENDING)], background=True)
        await db.handouts.create_index([("campaign_id", ASCENDING)], background=True)
        await db.player_handouts.create_index([("username", ASCENDING)], background=True)
        await db.player_handouts.create_index([("handout_id", ASCENDING), ("username", ASCENDING)], unique=True, background=True)
        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.warning(f"Could not create indexes: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
