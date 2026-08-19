"""Draft-first Rook creation workflow.

Unlike the legacy /rook/generate route, this module never saves generated
content during generation. The GM receives a structured draft, can retry/edit/
cancel it, and must explicitly call /rook/draft/save to make it campaign canon.
"""

from __future__ import annotations

import json
import re
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from models import NPC, NPCCreate, Location, LocationCreate, CustomCreature, CustomCreatureCreate
from utils.auth import check_ai_access, get_current_user, record_ai_usage, verify_campaign_ownership
from utils.helpers import get_campaign_context
from utils.llm_provider import LlmChat, UserMessage, get_llm_api_key
from utils.rook_brain import rook_brain_fragment
from utils.rook_rules import monster_design_fragment, review_creature_draft

router = APIRouter()

SOURCE_BOUNDARY = """
ROOK SOURCE BOUNDARY:
- Saved campaign data and uploaded/custom rules are factual source material.
- The GM's request is direction, not permission to import lore from published settings, actual-play shows, games, films, novels, or third-party IP.
- If campaign context is thin, create original material and keep assumptions obvious.
- Do not silently overwrite or contradict established campaign facts.
- This is a DRAFT. Do not describe it as saved, canon, approved, or already added to the campaign.
""".strip()

DRAFT_SCHEMAS = {
    "npc": """
Return JSON only with these fields:
{
  "name": "full name",
  "race": "species/ancestry",
  "class_name": "class or archetype if relevant",
  "level": 1,
  "alignment": "",
  "description": "short table-ready overview",
  "appearance": "short appearance",
  "personality": "short personality",
  "backstory": "brief background",
  "role": "campaign role or occupation",
  "hp": 10,
  "max_hp": 10,
  "ac": 10,
  "speed": "30 ft.",
  "proficiency_bonus": 2,
  "stats": {"strength": 10, "dexterity": 10, "constitution": 10, "intelligence": 10, "wisdom": 10, "charisma": 10},
  "saving_throws": [],
  "skills": [],
  "attacks": [{"name": "Attack", "bonus": "+2", "damage": "1d6 damage", "notes": ""}],
  "abilities": [],
  "location": "",
  "notes": "GM-only motivations, secrets, or hooks"
}
Keep combat statistics modest unless the GM explicitly asks for a combat-capable NPC.
""".strip(),
    "location": """
Return JSON only with these fields:
{
  "name": "location name",
  "location_type": "city, village, district, dungeon, wilderness, building, etc.",
  "description": "short sensory/table-ready description",
  "notable_npcs": "names only when supported by campaign context or newly drafted here",
  "notes": "GM-only hooks, secrets, practical running notes",
  "places_of_interest": []
}
Do not invent established campaign history unless the GM asks for new history.
""".strip(),
    "creature": """
Return JSON only with these fields:
{
  "name": "creature name",
  "cr": "Rook estimate such as 1/2, 2, 5",
  "hp": 20,
  "ac": 13,
  "type": "beast, humanoid, undead, monstrosity, etc.",
  "size": "Medium",
  "speed": "30 ft.",
  "abilities": "Field-ready combat text. Include attack bonus/save DC, target, damage dice/type, multiattack/recharge/trigger text when relevant.",
  "description": "appearance, behaviour, combat identity, and a short lore hook"
}
Challenge Rating is an estimate and must be reviewed, not asserted as mathematically guaranteed.
""".strip(),
}


def _json_object(raw: Any) -> Dict[str, Any]:
    text = raw if isinstance(raw, str) else str(raw or "")
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("Rook did not return a JSON object")
    parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise ValueError("Rook draft was not an object")
    return parsed


def _draft_warnings(entity_type: str, data: Dict[str, Any]) -> list[str]:
    if entity_type == "creature":
        return review_creature_draft(data)
    warnings: list[str] = []
    if not str(data.get("name") or "").strip():
        warnings.append("A name is required before this draft can be saved.")
    if entity_type == "npc" and not str(data.get("role") or data.get("description") or "").strip():
        warnings.append("Add a role or short description so the NPC is useful at the table.")
    if entity_type == "location" and not str(data.get("description") or "").strip():
        warnings.append("Add a short description before saving the location.")
    return warnings


@router.post("/rook/draft")
async def create_rook_draft(request: Dict[str, Any], username: str = Depends(get_current_user)):
    campaign_id = str(request.get("campaign_id") or "").strip()
    entity_type = str(request.get("entity_type") or "").strip().lower()
    prompt = str(request.get("prompt") or "").strip()
    previous_draft = request.get("previous_draft")

    if not campaign_id:
        raise HTTPException(status_code=400, detail="campaign_id is required")
    if entity_type not in DRAFT_SCHEMAS:
        raise HTTPException(status_code=400, detail="entity_type must be npc, location, or creature")
    if not prompt:
        raise HTTPException(status_code=400, detail="Tell Rook what you want to create")

    await verify_campaign_ownership(campaign_id, username)
    if not await check_ai_access(username, "ai"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Monthly AI request limit reached")

    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    campaign_context = await get_campaign_context(campaign_id)
    api_key = get_llm_api_key("openai")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    rules = monster_design_fragment() if entity_type == "creature" else ""
    retry_context = ""
    if isinstance(previous_draft, dict) and previous_draft:
        retry_context = (
            "\n\nPREVIOUS DRAFT TO IMPROVE OR REPLACE:\n"
            + json.dumps(previous_draft, ensure_ascii=False)
            + "\nCreate a fresh alternative unless the GM's prompt specifically asks to keep something."
        )

    system_message = "\n\n".join(filter(None, [
        rook_brain_fragment("generate", json_only=True, include_creative_bank=True),
        SOURCE_BOUNDARY,
        rules,
        f"CAMPAIGN RULES EDITION: {campaign.get('rules_edition') or campaign.get('system') or 'campaign default'}" if campaign else "",
    ]))

    user_prompt = (
        f"CREATE TYPE: {entity_type.upper()}\n\n"
        f"{DRAFT_SCHEMAS[entity_type]}\n\n"
        f"=== SAVED CAMPAIGN CONTEXT ===\n{campaign_context or 'No detailed campaign context is available.'}\n=== END CONTEXT ===\n\n"
        f"GM REQUEST: {prompt}{retry_context}"
    )

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"rook-draft-{username}-{uuid.uuid4().hex[:10]}",
            system_message=system_message,
        ).with_model("openai", "gpt-5.2")
        response = await chat.send_message(UserMessage(text=user_prompt))
        data = _json_object(response)
        warnings = _draft_warnings(entity_type, data)
        await record_ai_usage(username)
        return {
            "draft_id": str(uuid.uuid4()),
            "entity_type": entity_type,
            "data": data,
            "warnings": warnings,
            "saved": False,
            "message": "Draft ready for GM review. Nothing has been saved yet.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Rook draft generation failed: {exc}")


@router.post("/rook/draft/save")
async def save_rook_draft(request: Dict[str, Any], username: str = Depends(get_current_user)):
    campaign_id = str(request.get("campaign_id") or "").strip()
    entity_type = str(request.get("entity_type") or "").strip().lower()
    data = request.get("data")

    if not campaign_id:
        raise HTTPException(status_code=400, detail="campaign_id is required")
    if entity_type not in DRAFT_SCHEMAS:
        raise HTTPException(status_code=400, detail="entity_type must be npc, location, or creature")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="draft data is required")

    await verify_campaign_ownership(campaign_id, username)

    try:
        if entity_type == "npc":
            payload = NPCCreate(**data)
            model = NPC(campaign_id=campaign_id, **payload.model_dump())
            document = model.model_dump()
            await db.npcs.insert_one(document)
        elif entity_type == "location":
            payload = LocationCreate(**data)
            model = Location(campaign_id=campaign_id, **payload.model_dump())
            document = model.model_dump()
            await db.locations.insert_one(document)
        else:
            payload = CustomCreatureCreate(**data)
            model = CustomCreature(campaign_id=campaign_id, created_by=username, **payload.model_dump())
            document = model.model_dump()
            await db.custom_creatures.insert_one(document)

        document.pop("_id", None)
        return {
            "saved": True,
            "entity_type": entity_type,
            "entity": document,
            "warnings": _draft_warnings(entity_type, document),
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Draft could not be saved: {exc}")
