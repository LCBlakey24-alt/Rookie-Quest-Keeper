import asyncio
import os

import pytest
from fastapi import HTTPException

# The route module imports config at import time, so give it safe local values for unit tests.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookiequestkeeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "unit-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes import handouts as handout_routes  # noqa: E402


class FakePlayerHandoutsCollection:
    def __init__(self, record):
        self.record = record

    async def find_one(self, query):
        return self.record


class FakeDb:
    def __init__(self, player_handout):
        self.player_handouts = FakePlayerHandoutsCollection(player_handout)


def run_async(coro):
    return asyncio.run(coro)


def test_locked_handout_share_options_are_forbidden(monkeypatch):
    monkeypatch.setattr(
        handout_routes,
        "db",
        FakeDb({
            "handout_id": "handout-1",
            "campaign_id": "campaign-1",
            "username": "player-one",
            "allow_player_sharing": False,
        }),
    )

    with pytest.raises(HTTPException) as exc_info:
        run_async(handout_routes.get_player_handout_share_options("handout-1", current_user="player-one"))

    assert exc_info.value.status_code == 403
    assert "disabled player sharing" in exc_info.value.detail


def test_locked_handout_player_share_is_forbidden(monkeypatch):
    monkeypatch.setattr(
        handout_routes,
        "db",
        FakeDb({
            "handout_id": "handout-1",
            "campaign_id": "campaign-1",
            "username": "player-one",
            "allow_player_sharing": False,
        }),
    )

    with pytest.raises(HTTPException) as exc_info:
        run_async(
            handout_routes.share_player_handout(
                "handout-1",
                {"recipients": ["player-two"]},
                current_user="player-one",
            )
        )

    assert exc_info.value.status_code == 403
    assert "disabled player sharing" in exc_info.value.detail
