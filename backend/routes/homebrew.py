"""Homebrew Workshop — upload a .docx (or paste text) and have Rook parse or complete
structured race / class / subclass / background / magic-item / monster / NPC / custom-rule drafts
that the user can then edit and save into their own personal ruleset.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import io
import json
import re
import uuid
from datetime import datetime, timezone

from utils.auth import get_current_user
from config import db, logger
from utils.llm_provider import LlmChat, UserMessage, get_llm_api_key

try:
    from docx import Document
except ImportError:
    Document = None

router = APIRouter()

CONTENT_TYPES = {"race", "class", "subclass", "background", "magic_item", "monster", "npc", "custom_rule"}

COLLECTION = {
    "race": "user_races",
    "class": "user_classes",
    "subclass": "user_subclasses",
    "background": "user_backgrounds",
    "magic_item": "user_magic_items",
    "monster": "user_monsters",
    "npc": "user_npcs",
    "custom_rule": "user_custom_rules",
}

SCHEMA_HINTS = {
    "race": {
        "name": "string",
        "description": "string",
        "size": "Tiny|Small|Medium|Large",
        "speed": "int (default 30)",
        "ability_bonuses": "object e.g. {strength: 1, dexterity: 2}",
        "traits": "[{name, description}]",
        "languages": "[string]",
        "subraces": "[{name, description, ability_bonuses, traits}]",
    },
    "class": {
        "name": "string",
        "description": "string",
        "hit_die": "d6|d8|d10|d12",
        "primary_ability": "string",
        "saving_throw_proficiencies": "[string] — two abilities",
        "armor_proficiencies": "[string]",
        "weapon_proficiencies": "[string]",
        "features": "[{level: int 1-20, name, description}]",
    },
    "subclass": {
        "name": "string",
        "parent_class": "string — must match a class name",
        "description": "string",
        "subclass_level": "int (level the subclass unlocks, usually 3)",
        "features": "[{level: int 3-20, name, description}]",
    },
    "background": {
        "name": "string",
        "description": "string",
        "skill_proficiencies": "[string] — two skills",
        "tool_proficiencies": "[string]",
        "languages": "int — number of additional languages",
        "equipment": "[string]",
        "feature_name": "string",
        "feature_description": "string",
    },
    "magic_item": {
        "name": "string",
        "type": "Weapon|Armor|Wondrous Item|Potion|Ring|Rod|Scroll|Staff|Wand",
        "rarity": "common|uncommon|rare|very rare|legendary|artifact",
        "requires_attunement": "bool",
        "description": "string",
        "effects": "[string] — short bullet effects",
    },
    "monster": {
        "name": "string",
        "creature_type": "string, e.g. undead, fiend, beast, construct",
        "size": "Tiny|Small|Medium|Large|Huge|Gargantuan",
        "alignment": "string",
        "challenge_rating": "string or number",
        "armor_class": "int",
        "hit_points": "int",
        "speed": "string, e.g. 30 ft., fly 60 ft.",
        "abilities": "object with str,dex,con,int,wis,cha numbers",
        "saving_throws": "object or [string]",
        "skills": "object or [string]",
        "damage_resistances": "[string]",
        "damage_immunities": "[string]",
        "condition_immunities": "[string]",
        "senses": "string",
        "languages": "string",
        "traits": "[{name, description}]",
        "actions": "[{name, description, attack_bonus, damage}]",
        "bonus_actions": "[{name, description}]",
        "reactions": "[{name, description}]",
        "legendary_actions": "[{name, description}]",
        "lair_actions": "[{name, description}]",
        "description": "string",
        "role": "solo|brute|skirmisher|controller|minion|boss|support",
    },
    "npc": {
        "name": "string",
        "ancestry": "string",
        "role": "string, e.g. innkeeper, rival, captain, patron",
        "faction": "string",
        "location": "string",
        "appearance": "string",
        "personality": "string",
        "voice": "string",
        "mannerisms": "[string]",
        "ideal": "string",
        "bond": "string",
        "flaw": "string",
        "secret": "string",
        "wants": "string",
        "fears": "string",
        "quest_hooks": "[string]",
        "combat_role": "noncombatant|minion|rival|ally|boss|support",
        "stat_hint": "string, e.g. commoner, bandit captain, mage",
        "description": "string",
    },
    "custom_rule": {
        "name": "string",
        "category": "exploding_dice|chaos_tokens|custom_skill|resting|combat|magic|futuristic|other",
        "summary": "string",
        "enabled_by_default": "bool",
        "rule_text": "string",
        "trigger": "string",
        "resolution": "string",
        "examples": "[string]",
        "settings": "object. For exploding dice include dice: [d4,d6,d8,d10,d12,d20]. For skills include ability and description.",
        "player_visible": "bool",
        "gm_notes": "string",
    },
}


def _docx_to_text(file_bytes: bytes) -> str:
    if Document is None:
        raise HTTPException(status_code=503, detail="python-docx not installed on server")
    try:
        doc = Document(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read .docx file: {type(e).__name__}")
    parts: List[str] = []
    for p in doc.paragraphs:
        text = (p.text or "").strip()
        if text:
            parts.append(text)
    for table in doc.tables:
        for row in table.rows:
            row_cells = [c.text.strip() for c in row.cells if c.text and c.text.strip()]
            if row_cells:
                parts.append(" | ".join(row_cells))
    return "\n".join(parts)


def _extract_json(reply: str) -> Optional[Dict[str, Any]]:
    if not reply:
        return None
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", reply, re.DOTALL)
    candidate = fenced.group(1) if fenced else None
    if candidate is None:
        first = reply.find("{")
        last = reply.rfind("}")
        if first != -1 and last > first:
            candidate = reply[first:last + 1]
    if candidate is None:
        return None
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


def _required_fields_for(content_type: str) -> List[str]:
    return {
        "race": ["name", "size", "speed"],
        "class": ["name", "hit_die", "features"],
        "subclass": ["name", "parent_class", "features"],
        "background": ["name", "skill_proficiencies"],
        "magic_item": ["name", "rarity"],
        "monster": ["name", "armor_class", "hit_points", "challenge_rating", "actions"],
        "npc": ["name", "role", "personality", "secret"],
        "custom_rule": ["name", "category", "summary", "rule_text"],
    }[content_type]


def _flag_missing(content_type: str, parsed: Dict[str, Any]) -> List[str]:
    missing: List[str] = []
    for field in _required_fields_for(content_type):
        value = parsed.get(field)
        if value in (None, "", [], {}):
            missing.append(field)
    return missing


def _merge_draft(original: Dict[str, Any], completed: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(original or {})
    for key, value in (completed or {}).items():
        if value in (None, "", [], {}):
            continue
        current = merged.get(key)
        if current in (None, "", [], {}):
            merged[key] = value
        else:
            merged[key] = value
    return merged


async def _llm_json(content_type: str, system: str, prompt: str, username: str) -> Dict[str, Any]:
    if not LlmChat or not UserMessage or not get_llm_api_key("anthropic"):
        raise HTTPException(status_code=503, detail="Rook is not configured on this server.")
    chat = LlmChat(
        api_key=get_llm_api_key("anthropic"),
        session_id=f"homebrew-{content_type}-{username}-{uuid.uuid4().hex[:6]}",
        system_message=system
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    try:
        reply = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("Homebrew Rook request failed")
        raise HTTPException(status_code=502, detail=f"Rook request failed: {type(e).__name__}")
    parsed = _extract_json(reply or "")
    return parsed or {}


async def _llm_extract(content_type: str, raw_text: str, username: str) -> Dict[str, Any]:
    schema = SCHEMA_HINTS.get(content_type)
    if not schema:
        raise HTTPException(status_code=400, detail=f"Unsupported content_type '{content_type}'")
    schema_str = json.dumps(schema, indent=2)
    snippet = raw_text[:12000]
    system = (
        "You are Rook, an SRD-compliant TTRPG homebrew extraction assistant. Read the user's homebrew text and "
        "return ONLY a single JSON object that matches the requested schema. Use null, empty arrays, or empty strings "
        "for fields you cannot find. Do not include any explanation."
    )
    prompt = (
        f"Content type: {content_type}\n"
        f"Schema (return JSON matching this shape):\n{schema_str}\n\n"
        f"Source text:\n{snippet}\n\n"
        f"Return ONLY the JSON object."
    )
    return await _llm_json(content_type, system, prompt, username)


async def _llm_complete(content_type: str, draft: Dict[str, Any], context: str, username: str) -> Dict[str, Any]:
    schema = SCHEMA_HINTS.get(content_type)
    if not schema:
        raise HTTPException(status_code=400, detail=f"Unsupported content_type '{content_type}'")
    schema_str = json.dumps(schema, indent=2)
    draft_str = json.dumps(draft or {}, indent=2)[:12000]
    context_snippet = (context or "")[:6000]
    system = (
        "You are Rook, a practical TTRPG homebrew co-designer. Complete missing or thin fields using the user's existing choices, "
        "theme, tone, and stats. Keep rules usable at the table. Do not overwrite the core identity unless it is clearly empty. "
        "For monsters, produce a complete stat block. For NPCs, produce usable roleplay hooks. For custom rules, produce settings that software can read. "
        "Return ONLY one JSON object matching the schema. No markdown."
    )
    prompt = (
        f"Content type: {content_type}\n"
        f"Schema:\n{schema_str}\n\n"
        f"Current draft JSON:\n{draft_str}\n\n"
        f"Optional user source/context:\n{context_snippet}\n\n"
        "Fill missing or weak fields and return the complete JSON object."
    )
    completed = await _llm_json(content_type, system, prompt, username)
    return _merge_draft(draft or {}, completed)


@router.post("/homebrew/parse-docx")
async def parse_docx(
    content_type: str = Form(...),
    file: UploadFile = File(...),
    edition: str = Form("2014"),
    username: str = Depends(get_current_user)
):
    if content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"content_type must be one of {sorted(CONTENT_TYPES)}")
    if edition not in ("2014", "2024"):
        edition = "2014"

    filename = (file.filename or "").lower()
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    if filename.endswith(".docx"):
        text = _docx_to_text(raw_bytes)
    elif filename.endswith(".txt") or filename.endswith(".md"):
        try:
            text = raw_bytes.decode("utf-8", errors="ignore")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not read text file")
    else:
        raise HTTPException(status_code=400, detail="Only .docx, .txt, or .md files are supported")

    if not text.strip():
        raise HTTPException(status_code=400, detail="The file appears to be empty.")

    draft = await _llm_extract(content_type, text, username)
    missing = _flag_missing(content_type, draft)
    return {"content_type": content_type, "edition": edition, "draft": draft, "missing_fields": missing, "source_filename": file.filename, "source_excerpt": text[:1500]}


class ParseTextRequest(BaseModel):
    content_type: str
    edition: str = "2014"
    text: str


@router.post("/homebrew/parse-text")
async def parse_text(req: ParseTextRequest, username: str = Depends(get_current_user)):
    if req.content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"content_type must be one of {sorted(CONTENT_TYPES)}")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    draft = await _llm_extract(req.content_type, req.text, username)
    missing = _flag_missing(req.content_type, draft)
    return {"content_type": req.content_type, "edition": req.edition if req.edition in ("2014", "2024") else "2014", "draft": draft, "missing_fields": missing, "source_excerpt": req.text[:1500]}


class CompleteDraftRequest(BaseModel):
    content_type: str
    edition: str = "2014"
    draft: Dict[str, Any]
    context: str = ""


@router.post("/homebrew/complete-draft")
async def complete_draft(req: CompleteDraftRequest, username: str = Depends(get_current_user)):
    if req.content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"content_type must be one of {sorted(CONTENT_TYPES)}")
    completed = await _llm_complete(req.content_type, req.draft or {}, req.context or "", username)
    return {
        "content_type": req.content_type,
        "edition": req.edition if req.edition in ("2014", "2024") else "2014",
        "draft": completed,
        "missing_fields": _flag_missing(req.content_type, completed),
    }


class HomebrewSaveRequest(BaseModel):
    content_type: str
    edition: str = "2014"
    data: Dict[str, Any]
    ruleset_id: Optional[str] = None
    homebrew_id: Optional[str] = None


@router.post("/homebrew/save")
async def save_homebrew(req: HomebrewSaveRequest, username: str = Depends(get_current_user)):
    if req.content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="invalid content_type")
    coll_name = COLLECTION[req.content_type]
    ruleset_id = req.ruleset_id
    if not ruleset_id:
        existing = await db.user_rulesets.find_one({"user_id": username, "name": "Homebrew Workshop", "edition": req.edition}, {"_id": 0})
        if existing:
            ruleset_id = existing["id"]
        else:
            ruleset_id = str(uuid.uuid4())
            await db.user_rulesets.insert_one({
                "id": ruleset_id,
                "user_id": username,
                "name": "Homebrew Workshop",
                "description": "Rook-assisted homebrew content",
                "edition": req.edition,
                "version": "1.0",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    doc = {**req.data}
    doc.update({"user_id": username, "ruleset_id": ruleset_id, "edition": req.edition, "source": "Homebrew Workshop", "updated_at": datetime.now(timezone.utc).isoformat()})

    if req.homebrew_id:
        existing = await db[coll_name].find_one({"id": req.homebrew_id, "user_id": username})
        if not existing:
            raise HTTPException(status_code=404, detail="Homebrew item not found")
        await db[coll_name].update_one({"id": req.homebrew_id, "user_id": username}, {"$set": {k: v for k, v in doc.items() if k != "_id"}})
        doc["id"] = req.homebrew_id
    else:
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db[coll_name].insert_one(doc)

    doc.pop("_id", None)
    return {"saved": True, "content_type": req.content_type, "homebrew": doc}


@router.get("/homebrew")
async def list_homebrew(content_type: Optional[str] = None, edition: Optional[str] = None, username: str = Depends(get_current_user)):
    types = [content_type] if content_type else list(CONTENT_TYPES)
    out: Dict[str, List[Dict[str, Any]]] = {}
    for t in types:
        if t not in COLLECTION:
            continue
        q: Dict[str, Any] = {"user_id": username}
        if edition:
            q["edition"] = edition
        cursor = db[COLLECTION[t]].find(q, {"_id": 0})
        out[t] = [item async for item in cursor]
    return {"homebrew": out}


@router.delete("/homebrew/{content_type}/{homebrew_id}")
async def delete_homebrew(content_type: str, homebrew_id: str, username: str = Depends(get_current_user)):
    if content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="invalid content_type")
    coll_name = COLLECTION[content_type]
    result = await db[coll_name].delete_one({"id": homebrew_id, "user_id": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Homebrew item not found")
    return {"deleted": homebrew_id}
