"""NPC relationship edits must retain IDs and never cross campaign boundaries."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from models import NPCRelationshipCreate
from routes import npcs as routes


def make_db(existing=True, collision=False, missing_npc=False):
    original = {
        "id": "link-1", "campaign_id": "wednesday", "source_id": "mara",
        "target_id": "godfrey", "relationship_type": "family",
        "description": "Old connection", "created_at": "2026-01-01",
    }
    updated = {**original, "relationship_type": "parent",
               "description": "Mara is Godfrey's mother."}
    relations = SimpleNamespace(
        find_one=AsyncMock(side_effect=[
            original if existing else None,
            {"id": "other-link"} if collision else None,
            updated,
        ]),
        update_one=AsyncMock(),
    )
    characters = SimpleNamespace(find_one=AsyncMock(
        return_value=None if missing_npc else {"id": "within-wednesday"}
    ))
    return SimpleNamespace(npc_relationships=relations, npcs=characters)


@pytest.mark.asyncio
async def test_relationship_update_keeps_id_and_campaign_and_does_not_delete(monkeypatch):
    fake = make_db()
    owner = AsyncMock()
    monkeypatch.setattr(routes, "db", fake)
    monkeypatch.setattr(routes, "verify_campaign_ownership", owner)
    request = NPCRelationshipCreate(
        source_id="mara", target_id="godfrey",
        relationship_type="parent",
        description="Mara is Godfrey's mother.",
    )
    result = await routes.update_npc_relationship("wednesday", "link-1", request, "gm")
    owner.assert_awaited_once_with("wednesday", "gm")
    assert result["id"] == "link-1"
    assert result["created_at"] == "2026-01-01"
    args, kwargs = fake.npc_relationships.update_one.await_args
    assert args[0] == {"id": "link-1", "campaign_id": "wednesday"}
    assert args[1]["$set"]["relationship_type"] == "parent"
    assert args[1]["$set"]["description"] == "Mara is Godfrey's mother."
    assert "id" not in args[1]["$set"]
    assert "campaign_id" not in args[1]["$set"]
    assert "created_at" not in args[1]["$set"]
    duplicate_query = fake.npc_relationships.find_one.await_args_list[1].args[0]
    assert duplicate_query["id"] == {"$ne": "link-1"}
    for call in fake.npcs.find_one.await_args_list:
        assert call.args[0]["campaign_id"] == "wednesday"


@pytest.mark.asyncio
async def test_relationship_update_rejects_duplicate_and_does_not_mutate(monkeypatch):
    fake = make_db(collision=True)
    monkeypatch.setattr(routes, "db", fake)
    monkeypatch.setattr(routes, "verify_campaign_ownership", AsyncMock())
    with pytest.raises(HTTPException) as failure:
        await routes.update_npc_relationship("wednesday", "link-1",
            NPCRelationshipCreate(source_id="mara", target_id="godfrey", relationship_type="family"), "gm")
    assert failure.value.status_code == 409
    fake.npc_relationships.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_relationship_update_rejects_cross_campaign_npc(monkeypatch):
    fake = make_db(missing_npc=True)
    monkeypatch.setattr(routes, "db", fake)
    monkeypatch.setattr(routes, "verify_campaign_ownership", AsyncMock())
    with pytest.raises(HTTPException) as failure:
        await routes.update_npc_relationship("wednesday", "link-1",
            NPCRelationshipCreate(source_id="mara", target_id="godfrey", relationship_type="parent"), "gm")
    assert failure.value.status_code == 404
    fake.npc_relationships.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_relationship_update_rejects_missing_link_and_self_link(monkeypatch):
    fake = make_db(existing=False)
    monkeypatch.setattr(routes, "db", fake)
    monkeypatch.setattr(routes, "verify_campaign_ownership", AsyncMock())
    with pytest.raises(HTTPException) as missing:
        await routes.update_npc_relationship("wednesday", "missing",
            NPCRelationshipCreate(source_id="mara", target_id="godfrey"), "gm")
    assert missing.value.status_code == 404
    fake.npc_relationships.update_one.assert_not_awaited()

    fake2 = make_db()
    monkeypatch.setattr(routes, "db", fake2)
    with pytest.raises(HTTPException) as self_link:
        await routes.update_npc_relationship("wednesday", "link-1",
            NPCRelationshipCreate(source_id="mara", target_id="mara"), "gm")
    assert self_link.value.status_code == 422
    fake2.npc_relationships.update_one.assert_not_awaited()
