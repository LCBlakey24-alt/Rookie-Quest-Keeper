"""
ROOK Backend - Rookie Quest Keeper
Thin entry point that assembles all modular routers.
"""
import asyncio
import logging
import os

from fastapi import FastAPI, APIRouter, Request
from pymongo.errors import PyMongoError
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from config import client, db, logger, CORS_ORIGIN_LIST
from routes.auth import EMAIL_DELIVERY_CONFIGURED
from utils.live_socket import websocket_campaign_sync
from utils.rate_limit import RateLimitMiddleware
from utils.child_access import ChildAccountMiddleware
from routes import all_routers
from routes.rule_systems import initialize_rule_systems


# Create the main app
app = FastAPI()

# Lightweight route-based protection for auth, AI, and parsing endpoints.
app.add_middleware(RateLimitMiddleware)

# Child accounts reach only what utils/child_access.py names. This sits in
# middleware rather than in each route because a per-route check would leave
# every route added later open to them by default.
app.add_middleware(ChildAccountMiddleware)

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


@app.exception_handler(PyMongoError)
async def database_unavailable_handler(request: Request, exc: PyMongoError):
    """Keep infrastructure failures distinct from bad credentials/user errors."""
    logger.warning("Database unavailable while handling %s %s: %s", request.method, request.url.path, type(exc).__name__)
    return JSONResponse(
        status_code=503,
        content={
            "detail": "The Rookie Quest Keeper account service is temporarily unavailable. Your account data has not been changed; please try again shortly."
        },
        headers={"Retry-After": "30"},
    )


# Liveness stays independent of MongoDB so a database outage does not make the
# web process itself look dead. Readiness below confirms Keeper can serve data.
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Return whether the FastAPI process itself is running."""
    # Render sets RENDER_GIT_COMMIT on every deploy. Exposing the short SHA
    # lets a release be verified against the backend itself rather than
    # inferred from the frontend deployment.
    revision = (os.environ.get("RENDER_GIT_COMMIT") or "")[:12]
    return {"status": "healthy", "service": "rook-backend", "revision": revision}


@app.get("/ready")
@app.get("/api/ready")
async def readiness_check():
    """Return 200 only when the backend can reach Keeper's primary database."""
    try:
        await asyncio.wait_for(db.command("ping"), timeout=3.0)
    except Exception as exc:
        logger.warning("Readiness check failed: %s", type(exc).__name__)
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "service": "rook-backend", "database": "unavailable"},
            headers={"Retry-After": "15"},
        )
    # Email delivery is reported but deliberately does not change the status:
    # the backend serves fine without it. It is here so an operator can see at
    # a glance whether password recovery can actually deliver, rather than
    # finding out from a locked-out player.
    return {
        "status": "ready",
        "service": "rook-backend",
        "database": "available",
        "email_delivery": "configured" if EMAIL_DELIVERY_CONFIGURED else "not-configured",
    }


# WebSocket endpoint for real-time campaign sync (utils/live_socket.py)
app.add_api_websocket_route("/ws/campaign/{campaign_id}", websocket_campaign_sync)


async def run_startup_maintenance():
    """Run idempotent database maintenance without blocking auth/health startup."""
    # Warm the lazy Mongo client immediately after the web process becomes
    # responsive. This pays DNS/TLS/server-selection setup in the background
    # while the user is still reading the landing or sign-in screen.
    try:
        await db.command('ping')
        logger.info("MongoDB connection warmed")
    except Exception as e:
        logger.warning(f"Could not warm MongoDB connection: {e}")

    try:
        await initialize_rule_systems()
        logger.info("Rule systems initialized")
    except Exception as e:
        logger.warning(f"Could not initialize rule systems: {e}")

    # Seed premade character templates into MongoDB if missing.
    try:
        from routes.character_templates import seed_templates_if_empty
        await seed_templates_if_empty()
    except Exception as e:
        logger.warning(f"Could not seed character templates: {e}")

    # Ensure indexes exist for the most queried fields. create_index is a no-op
    # if the index already exists, so this can safely run just after the server
    # begins accepting requests instead of extending every cold-start login.
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
        await db.campaign_settings.create_index([("campaign_id", ASCENDING)], background=True)
        await db.calendars.create_index([("campaign_id", ASCENDING)], background=True)
        for col_name in ("npcs", "notes", "ingame_notes", "locations", "maps", "world_maps",
                         "local_maps", "combat_encounters", "combat_sessions", "inventory",
                         "party_currency", "custom_items", "campaign_events", "location_economy",
                         "handouts", "session_recaps", "calendar_events"):
            col = getattr(db, col_name)
            await col.create_index([("campaign_id", ASCENDING)], background=True)

        # Dashboard/homebrew library queries are user-scoped across these
        # separate collections. Indexing user_id keeps the one-request dashboard
        # fast as a user's personal library grows.
        for col_name in (
            "user_races", "user_classes", "user_subclasses", "user_feats",
            "user_spells", "user_backgrounds", "user_magic_items",
            "user_monsters", "user_npcs", "user_custom_rules",
        ):
            await getattr(db, col_name).create_index([("user_id", ASCENDING)], background=True)

        await db.ai_usage.create_index([("username", ASCENDING), ("month", ASCENDING)], background=True)
        await db.user_playtest_packs.create_index([("user_id", ASCENDING), ("edition", ASCENDING)], background=True)
        await db.user_playtest_packs.create_index([("campaign_id", ASCENDING)], background=True)
        await db.user_playtest_content.create_index([("user_id", ASCENDING), ("edition", ASCENDING), ("content_type", ASCENDING)], background=True)
        await db.user_playtest_content.create_index([("pack_id", ASCENDING)], background=True)
        await db.user_playtest_content.create_index([("campaign_id", ASCENDING)], background=True)
        await db.password_resets.create_index([("token", ASCENDING)], background=True)
        await db.password_resets.create_index([("email", ASCENDING)], background=True)
        await db.privacy_rights_requests.create_index([("username", ASCENDING), ("created_at", ASCENDING)], background=True)
        await db.handouts.create_index([("campaign_id", ASCENDING)], background=True)
        await db.player_handouts.create_index([("username", ASCENDING)], background=True)
        await db.player_handouts.create_index([("handout_id", ASCENDING), ("username", ASCENDING)], unique=True, background=True)
        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.warning(f"Could not create indexes: {e}")

    # Separate, so a failure above cannot leave roll de-duplication without
    # its unique index (the route still checks before inserting).
    try:
        from routes.roll_events import ensure_roll_event_indexes
        await ensure_roll_event_indexes(db)
        logger.info("Roll event indexes ensured")
    except Exception as e:
        logger.warning(f"Could not create roll event indexes: {e}")

    # Player-display revision writes use atomic upserts keyed by campaign.
    # Enforce one document per campaign, including simultaneous first writes.
    # Keep this separate from other maintenance, so unrelated indexes cannot
    # prevent display-state uniqueness from being ensured.
    try:
        from routes.campaign_display import ensure_campaign_display_indexes
        await ensure_campaign_display_indexes(db)
        logger.info("Player display unique campaign index ensured")
    except Exception as e:
        logger.warning(f"Could not ensure unique player-display campaign index: {e}")

    # Separate from dice de-duplication so interrupted End Session recovery
    # can also enforce one pending recap per campaign at the database level.
    try:
        from routes.roll_events import ensure_roll_session_indexes
        await ensure_roll_session_indexes(db)
        logger.info("Roll session recovery indexes ensured")
    except Exception as e:
        logger.warning(f"Could not create roll session recovery indexes: {e}")


@app.on_event("startup")
async def startup_event():
    """Become responsive first, then finish idempotent database maintenance."""
    app.state.startup_maintenance_task = asyncio.create_task(run_startup_maintenance())
    logger.info("ROOK backend ready; startup maintenance is running in the background")


@app.on_event("shutdown")
async def shutdown_db_client():
    task = getattr(app.state, "startup_maintenance_task", None)
    if task and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    client.close()