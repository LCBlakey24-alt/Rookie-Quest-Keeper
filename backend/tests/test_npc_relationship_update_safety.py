"""Relationship edits preserve the link and enforce active-campaign boundaries."""
import asyncio
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import NPCRelationshipCreate

# Load only this route module: importing routes.__init__ also imports email
# providers unrelated to NPC relationships, which CI intentionally omits.
import importlib.util
spec = importlib.util.spec_from_file_location(
    "npc_relationship_route_under_test",
    Path(__file__).resolve().parents[1] / "routes" / "npcs.py",
)
npc_routes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(npc_routes)


class FakeNpcCollection:
    async def find_one(self, query):
        if query.get("campaign_id") != "wednesday":
            return None
        if query.get("id") in ("godfrey", "mara"):
            return {"id": query["id"], "campaign_id": "wednesday"}
        return None


class FakeRelationshipCollection:
    def __init__(self):
        self.original = {
            "id": "link-1", "campaign_id": "wednesday", "source_id": "godfrey",
            "target_id": "mara", "relationship_type": "family",
            "description": "Family", "created_at": "2026-10-01T00:00:00Z",
        }
        self.writes = []

    async def find_one(self, query, projection=None):
        if query.get("campaign_id") != "wednesday":
            return None
        if query.get("id") == "link-1":
            return self.original.copy()
        # Duplicate query excludes the link being edited.
        return None

    async def update_one(self, query, patch):
        self.writes.append((query, patch))
        return SimpleNamespace(matched_count=1)


def test_edit_preserves_identity_and_is_scoped_to_wednesday(monkeypatch):
    checked = []
    async def allow(campaign_id, username):
        checked.append((campaign_id, username))

    relationships = FakeRelationshipCollection()
    monkeypatch.setattr(npc_routes, "verify_campaign_ownership", allow)
    monkeypatch.setattr(npc_routes, "db", SimpleNamespace(
        npcs=FakeNpcCollection(), npc_relationships=relationships))
    update = NPCRelationshipCreate(
        source_id="godfrey", target_id="mara", relationship_type="parent",
        description="Mara is Godfrey's mother",
    )
    saved = asyncio.run(npc_routes.update_npc_relationship(
        "wednesday", "link-1", update, username="LCBlakey24"))
    assert checked == [("wednesday", "LCBlakey24")]
    assert saved["id"] == "link-1"
    assert saved["created_at"] == "2026-10-01T00:00:00Z"
    assert saved["relationship_type"] == "parent"
    assert relationships.writes == [(
        {"id": "link-1", "campaign_id": "wednesday"},
        {"$set": update.model_dump()},
    )]


def test_edit_rejects_self_links_without_touching_database(monkeypatch):
    async def allow(campaign_id, username):
        pass
    relationships = FakeRelationshipCollection()
    monkeypatch.setattr(npc_routes, "verify_campaign_ownership", allow)
    monkeypatch.setattr(npc_routes, "db", SimpleNamespace(
        npcs=FakeNpcCollection(), npc_relationships=relationships))
    proposed = NPCRelationshipCreate(
        source_id="godfrey", target_id="godfrey", relationship_type="family")
    with pytest.raises(HTTPException) as error:
        asyncio.run(npc_routes.update_npc_relationship(
            "wednesday", "link-1", proposed, username="LCBlakey24"))
    assert error.value.status_code == 422
    assert not relationships.writes


def test_edit_cannot_point_a_wednesday_link_to_a_friday_only_npc(monkeypatch):
    async def allow(campaign_id, username):
        pass
    relationships = FakeRelationshipCollection()
    monkeypatch.setattr(npc_routes, "verify_campaign_ownership", allow)
    monkeypatch.setattr(npc_routes, "db", SimpleNamespace(
        npcs=FakeNpcCollection(), npc_relationships=relationships))
    proposed = NPCRelationshipCreate(
        source_id="godfrey", target_id="friday-only-npc", relationship_type="ally")
    with pytest.raises(HTTPException) as error:
        asyncio.run(npc_routes.update_npc_relationship(
            "wednesday", "link-1", proposed, username="LCBlakey24"))
    assert error.value.status_code == 404
    assert not relationships.writes
