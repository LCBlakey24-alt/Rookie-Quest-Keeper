"""The generic GM onboarding journey must start empty, then create usable content.

No real accounts or stored campaigns are used; this exercises the existing
campaign, NPC and custom-creature route functions with two isolated GMs.
"""
from __future__ import annotations

import asyncio
import copy
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for key, value in {
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "rqk_universal_onboarding_test",
    "JWT_SECRET_KEY": "unit-test-secret",
    "APP_URL": "http://localhost",
    "CORS_ORIGINS": "http://localhost",
}.items():
    os.environ.setdefault(key, value)


def route_module(name):
    spec = importlib.util.spec_from_file_location(
        "universal_onboarding_" + name, ROOT / "routes" / (name + ".py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


setup = route_module("campaign_setup")
npcs = route_module("npcs")
creatures = route_module("custom_creatures")


class Cursor:
    def __init__(self, records):
        self.records = records

    def sort(self, *_args):
        return self

    async def to_list(self, limit):
        return copy.deepcopy(self.records[:limit])


class Collection:
    def __init__(self):
        self.records = []

    async def insert_one(self, record):
        self.records.append(copy.deepcopy(record))
        return SimpleNamespace(inserted_id=record.get("id"))

    def find(self, query, projection=None):
        return Cursor([
            {k: copy.deepcopy(v) for k, v in item.items() if not (projection and projection.get(k) == 0)}
            for item in self.records
            if all(item.get(key) == value for key, value in query.items())
        ])

    async def find_one(self, query, projection=None):
        rows = await self.find(query, projection).to_list(1)
        return rows[0] if rows else None

    async def delete_one(self, query):
        found = await self.find_one(query)
        if found:
            self.records.remove(next(record for record in self.records if record.get("id") == found.get("id")))
        return SimpleNamespace(deleted_count=int(bool(found)))


async def _flow(monkeypatch):
    db = SimpleNamespace(
        campaigns=Collection(), campaign_invites=Collection(),
        npcs=Collection(), custom_creatures=Collection(),
    )

    async def verify_owner(campaign_id, username):
        owned = await db.campaigns.find_one({"id": campaign_id, "dm_user_id": username})
        if not owned:
            raise HTTPException(status_code=404, detail="Campaign not found")

    async def allow(_name, _default=True):
        return True

    async def create_code():
        return "ONBRD5"

    async def attach_counts(rows):
        return rows

    monkeypatch.setattr(setup, "db", db)
    monkeypatch.setattr(setup, "site_flag_enabled", allow)
    monkeypatch.setattr(setup, "create_unique_join_code", create_code)
    monkeypatch.setattr(setup, "attach_campaign_counts", attach_counts)
    monkeypatch.setattr(npcs, "db", db)
    monkeypatch.setattr(npcs, "verify_campaign_ownership", verify_owner)
    monkeypatch.setattr(creatures, "db", db)
    monkeypatch.setattr(creatures, "verify_campaign_ownership", verify_owner)

    # Another GM has content; a new GM must still start completely empty.
    other = await setup.create_campaign({"name": "Other GM world"}, "gm-other")
    await npcs.create_npc(other["id"], npcs.NPCCreate(name="Other GM's NPC"), "gm-other")

    assert await setup.get_campaigns("gm-new") == []
    assert await setup.get_campaigns("gm-other") == [other | {}] or (
        await setup.get_campaigns("gm-other")
    )[0]["id"] == other["id"]

    fresh = await setup.create_campaign(
        {"name": "New World", "description": "", "world_name": "Untitled"},
        "gm-new",
    )
    fresh_id = fresh["id"]
    assert fresh["dm_user_id"] == "gm-new"
    assert fresh["world_name"] == "Untitled"
    assert "Tia Karta" not in str(fresh)
    assert await npcs.get_npcs(fresh_id, "gm-new") == []
    assert await creatures.get_custom_creatures(fresh_id, "gm-new") == []

    citizen = await npcs.create_npc(
        fresh_id,
        npcs.NPCCreate(name="Adventurer's Guide", description="A local guide", hp=16, ac=12),
        "gm-new",
    )
    assert citizen["name"] == "Adventurer's Guide"
    assert citizen["campaign_id"] == fresh_id

    beast_result = await creatures.create_custom_creature(
        fresh_id,
        creatures.CustomCreatureCreate(
            name="Ash Drake", cr="2", type="dragon", size="Medium",
            hp=45, ac=14, speed="30 ft.",
            abilities="Bite", description="A creature made for the new world.",
        ),
        "gm-new",
    )
    assert beast_result["creature"]["campaign_id"] == fresh_id
    assert beast_result["creature"]["created_by"] == "gm-new"

    new_gm_npcs = await npcs.get_npcs(fresh_id, "gm-new")
    new_gm_creatures = await creatures.get_custom_creatures(fresh_id, "gm-new")
    assert [entry["name"] for entry in new_gm_npcs] == ["Adventurer's Guide"]
    assert [entry["name"] for entry in new_gm_creatures] == ["Ash Drake"]
    assert (await npcs.get_npcs(other["id"], "gm-other"))[0]["name"] == "Other GM's NPC"

    with pytest.raises(HTTPException) as forbidden_npc:
        await npcs.get_npcs(other["id"], "gm-new")
    assert forbidden_npc.value.status_code == 404

    with pytest.raises(HTTPException) as forbidden_creature:
        await creatures.get_custom_creatures(fresh_id, "gm-other")
    assert forbidden_creature.value.status_code == 404


def test_fresh_campaign_then_npc_and_beast_creation_are_independent(monkeypatch):
    asyncio.run(_flow(monkeypatch))
