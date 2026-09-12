import asyncio
import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookiequestkeeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "unit-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes import player_handout_summary as summary_routes  # noqa: E402


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, length):
        return self.rows[:length]


class FakePlayerHandoutsCollection:
    def __init__(self, rows):
        self.rows = rows
        self.pipeline = None

    def aggregate(self, pipeline):
        self.pipeline = pipeline
        return FakeCursor(self.rows)


class FakeDb:
    def __init__(self, rows):
        self.player_handouts = FakePlayerHandoutsCollection(rows)


def run_async(coro):
    return asyncio.run(coro)


def test_player_handout_summary_returns_counts(monkeypatch):
    fake_db = FakeDb([{"_id": None, "total": 7, "unread": 3, "saved": 2}])
    monkeypatch.setattr(summary_routes, "db", fake_db)

    result = run_async(summary_routes.get_player_handout_summary(current_user="player-one"))

    assert result == {"total": 7, "unread": 3, "saved": 2}
    assert fake_db.player_handouts.pipeline[0] == {"$match": {"username": "player-one"}}


def test_player_handout_summary_returns_zeroes_when_player_has_none(monkeypatch):
    monkeypatch.setattr(summary_routes, "db", FakeDb([]))

    result = run_async(summary_routes.get_player_handout_summary(current_user="player-one"))

    assert result == {"total": 0, "unread": 0, "saved": 0}
