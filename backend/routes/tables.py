"""Campaign table routes for GM reference and live-session roll tables."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from config import db
from utils.auth import get_current_user, verify_campaign_membership, verify_campaign_ownership

router = APIRouter()


CATEGORY_ALIASES = {
    "general": "general",
    "travel": "travel",
    "journey": "travel",
    "journeys": "travel",
    "fate": "fate",
    "quirks": "fate",
    "quirks of fate": "fate",
    "encounter": "encounter",
    "encounters": "encounter",
    "random encounter": "encounter",
    "weapons": "weapons",
    "weapon": "weapons",
    "finesse": "weapons",
    "ammunition": "weapons",
    "armour": "armour",
    "armor": "armour",
    "shield": "armour",
    "shields": "armour",
    "potions": "potions",
    "potion": "potions",
    "poisons": "potions",
    "poison": "potions",
    "herbs": "potions",
    "herb": "potions",
    "prices": "prices",
    "price": "prices",
    "costs": "prices",
    "cost": "prices",
    "costs & shops": "prices",
    "costs and shops": "prices",
    "shops": "prices",
    "shop": "prices",
    "equipment": "prices",
    "services": "prices",
    "npc": "npc",
    "npcs": "npc",
    "people": "npc",
    "lore": "lore",
    "rules": "rules",
    "rules reference": "rules",
    "reference": "rules",
    "combat rules": "rules",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalise_category(raw_category: Any, fallback_name: Any = "") -> str:
    """Convert user-facing category labels into stable frontend slugs."""
    value = re.sub(r"\s+", " ", str(raw_category or "").strip().lower())
    if value in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[value]

    name = str(fallback_name or "").lower()
    haystack = f"{value} {name}"
    if any(word in haystack for word in ["weapon", "finesse", "ammunition"]):
        return "weapons"
    if any(word in haystack for word in ["armour", "armor", "shield"]):
        return "armour"
    if any(word in haystack for word in ["potion", "poison", "herb"]):
        return "potions"
    if any(word in haystack for word in ["cost", "price", "shop", "equipment", "service", "mount", "food"]):
        return "prices"
    if any(word in haystack for word in ["travel", "journey", "watch", "rest"]):
        return "travel"
    if any(word in haystack for word in ["quirk", "fate", "opian"]):
        return "fate"
    if any(word in haystack for word in ["encounter", "combat"]):
        return "encounter"
    if any(word in haystack for word in ["action", "reaction", "cover", "condition", "damage", "death", "dc"]):
        return "rules"
    if any(word in haystack for word in ["npc", "people", "villain", "shopkeeper"]):
        return "npc"
    if "lore" in haystack:
        return "lore"
    return "general"


def normalise_range(raw_range: Any, fallback_index: int) -> str:
    """Keep roll ranges for dice tables and labels for reference tables."""
    value = str(raw_range or "").strip().replace(" ", "")
    if not value:
        return str(fallback_index)
    if re.match(r"^\d+(?:[–-]\d+)?$", value):
        return value
    label = str(raw_range or "").strip()
    return label[:120] if label else str(fallback_index)


def entry_max(entry_range: str) -> int:
    numbers = [int(value) for value in re.findall(r"\d+", str(entry_range))]
    return max(numbers) if numbers else 1


def has_numeric_range(entry_range: Any) -> bool:
    return bool(re.match(r"^\d+(?:[–-]\d+)?$", str(entry_range or "").strip().replace(" ", "")))


def normalise_die(raw_die: Any, entries: Optional[List[Dict[str, Any]]] = None) -> str:
    """Store only reference or d-number dice values that match the table rows."""
    clean_entries = entries or []
    if not clean_entries:
        return "d20"
    if not all(has_numeric_range(entry.get("range")) for entry in clean_entries):
        return "reference"

    row_sides = max(20, max(entry_max(entry["range"]) for entry in clean_entries))
    raw = str(raw_die or "").strip().lower().replace(" ", "")
    if raw == "reference":
        return "reference"
    match = re.match(r"^d?(\d+)$", raw)
    if match:
        return f"d{max(row_sides, int(match.group(1)))}"
    return f"d{row_sides}"


def clean_columns(columns: Optional[List[Any]]) -> List[str]:
    seen = set()
    cleaned: List[str] = []
    for column in columns or []:
        value = str(column or "").strip()[:60]
        if not value:
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(value)
    return cleaned[:12]


def clean_cells(raw_cells: Any, allowed_columns: Optional[List[str]] = None) -> Dict[str, str]:
    if not isinstance(raw_cells, dict):
        return {}
    allowed = {column.lower(): column for column in allowed_columns or []}
    cells: Dict[str, str] = {}
    for raw_key, raw_value in raw_cells.items():
        key = str(raw_key or "").strip()[:60]
        if not key:
            continue
        if allowed and key.lower() not in allowed:
            continue
        display_key = allowed.get(key.lower(), key)
        cells[display_key] = str(raw_value or "").strip()[:500]
    return cells


def coerce_entry(raw_entry: Any, fallback_index: int) -> Dict[str, Any]:
    """Accept dict rows, two-item rows, or plain text rows from imperfect imports."""
    if isinstance(raw_entry, dict):
        return raw_entry
    if isinstance(raw_entry, (list, tuple)):
        return {
            "range": raw_entry[0] if len(raw_entry) > 0 else fallback_index,
            "text": raw_entry[1] if len(raw_entry) > 1 else "",
        }
    return {"range": fallback_index, "text": raw_entry}


def normalise_entries(entries: Optional[List[Any]], columns: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    cleaned: List[Dict[str, Any]] = []
    for index, raw_entry in enumerate(entries or [], start=1):
        entry = coerce_entry(raw_entry, index)
        text = str(entry.get("text") or entry.get("result") or entry.get("description") or "").strip()
        cells = clean_cells(entry.get("cells"), columns)
        if not text and cells:
            text = " | ".join(f"{key}: {value}" for key, value in cells.items() if value)
        if not text:
            continue
        cleaned_entry: Dict[str, Any] = {
            "range": normalise_range(entry.get("range") or entry.get("roll"), index),
            "text": text[:1000],
        }
        if cells:
            cleaned_entry["cells"] = cells
        cleaned.append(cleaned_entry)
    cleaned.sort(key=lambda item: entry_max(str(item["range"]).split("-")[0]))
    return cleaned[:200]


def normalise_table_document(raw_table: Dict[str, Any]) -> Dict[str, Any]:
    """Return a response-safe campaign table document without mutating stored lore."""
    name = str(raw_table.get("name") or "Untitled Table").strip()[:120] or "Untitled Table"
    columns = clean_columns(raw_table.get("columns"))
    entries = normalise_entries(raw_table.get("entries"), columns)
    return {
        **raw_table,
        "id": str(raw_table.get("id") or uuid.uuid4()),
        "campaign_id": str(raw_table.get("campaign_id") or ""),
        "name": name,
        "category": normalise_category(raw_table.get("category"), name),
        "description": str(raw_table.get("description") or "").strip(),
        "die": normalise_die(raw_table.get("die"), entries),
        "columns": columns,
        "entries": entries,
        "is_player_safe": bool(raw_table.get("is_player_safe", False)),
        "source": str(raw_table.get("source") or "custom").strip() or "custom",
        "created_by": str(raw_table.get("created_by") or ""),
        "created_at": str(raw_table.get("created_at") or now_iso()),
        "updated_at": str(raw_table.get("updated_at") or raw_table.get("created_at") or now_iso()),
    }


async def find_campaign_table_or_404(campaign_id: str, table_id: str, *, player_safe_only: bool = False) -> Dict[str, Any]:
    query: Dict[str, Any] = {"id": table_id, "campaign_id": campaign_id}
    if player_safe_only:
        query["is_player_safe"] = True
    table = await db.campaign_tables.find_one(query, {"_id": 0})
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return normalise_table_document(table)


class CampaignTableCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    category: str = "general"
    description: str = ""
    die: str = "d20"
    columns: List[str] = []
    entries: List[Any] = []
    is_player_safe: bool = False
    source: str = "custom"


class CampaignTableUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    category: Optional[str] = None
    description: Optional[str] = None
    die: Optional[str] = None
    columns: Optional[List[str]] = None
    entries: Optional[List[Any]] = None
    is_player_safe: Optional[bool] = None
    source: Optional[str] = None


class CampaignTable(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    category: str = "general"
    description: str = ""
    die: str = "d20"
    columns: List[str] = []
    entries: List[Dict[str, Any]] = []
    is_player_safe: bool = False
    source: str = "custom"
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


@router.get("/campaigns/{campaign_id}/tables", response_model=List[CampaignTable])
async def list_campaign_tables(campaign_id: str, username: str = Depends(get_current_user)):
    """List GM-owned tables attached to a campaign for prep and live-session use."""
    await verify_campaign_ownership(campaign_id, username)
    tables = await db.campaign_tables.find({"campaign_id": campaign_id}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [normalise_table_document(table) for table in tables]


@router.get("/campaigns/{campaign_id}/tables/{table_id}", response_model=CampaignTable)
async def get_campaign_table(campaign_id: str, table_id: str, username: str = Depends(get_current_user)):
    """Read one GM-owned campaign table by id."""
    await verify_campaign_ownership(campaign_id, username)
    return await find_campaign_table_or_404(campaign_id, table_id)


@router.get("/campaigns/{campaign_id}/player-safe-tables", response_model=List[CampaignTable])
async def list_player_safe_campaign_tables(campaign_id: str, username: str = Depends(get_current_user)):
    """List only GM-approved player-safe tables for future player-facing views."""
    await verify_campaign_membership(campaign_id, username)
    tables = await db.campaign_tables.find(
        {"campaign_id": campaign_id, "is_player_safe": True},
        {"_id": 0},
    ).sort("name", 1).to_list(500)
    return [normalise_table_document(table) for table in tables]


@router.get("/campaigns/{campaign_id}/player-safe-tables/{table_id}", response_model=CampaignTable)
async def get_player_safe_campaign_table(campaign_id: str, table_id: str, username: str = Depends(get_current_user)):
    """Read one GM-approved player-safe table by id."""
    await verify_campaign_membership(campaign_id, username)
    return await find_campaign_table_or_404(campaign_id, table_id, player_safe_only=True)


@router.post("/campaigns/{campaign_id}/tables", response_model=CampaignTable)
async def create_campaign_table(campaign_id: str, table_data: CampaignTableCreate, username: str = Depends(get_current_user)):
    """Create a reusable campaign table without touching any existing campaign lore."""
    await verify_campaign_ownership(campaign_id, username)
    columns = clean_columns(table_data.columns)
    entries = normalise_entries(table_data.entries, columns)
    if len(entries) < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add at least one table result")
    table = CampaignTable(
        campaign_id=campaign_id,
        name=table_data.name.strip(),
        category=normalise_category(table_data.category, table_data.name),
        description=table_data.description.strip(),
        die=normalise_die(table_data.die, entries),
        columns=columns,
        entries=entries,
        is_player_safe=table_data.is_player_safe,
        source=(table_data.source or "custom").strip(),
        created_by=username,
    )
    await db.campaign_tables.insert_one(table.model_dump())
    return table


@router.put("/campaigns/{campaign_id}/tables/{table_id}", response_model=CampaignTable)
async def update_campaign_table(campaign_id: str, table_id: str, table_data: CampaignTableUpdate, username: str = Depends(get_current_user)):
    """Update one campaign table by id."""
    await verify_campaign_ownership(campaign_id, username)
    existing = await db.campaign_tables.find_one({"id": table_id, "campaign_id": campaign_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

    update_dict = {key: value for key, value in table_data.model_dump().items() if value is not None}
    if "name" in update_dict:
        update_dict["name"] = str(update_dict["name"]).strip()
    if "category" in update_dict:
        fallback_name = update_dict.get("name") or existing.get("name", "")
        update_dict["category"] = normalise_category(update_dict["category"], fallback_name)
    if "description" in update_dict:
        update_dict["description"] = str(update_dict["description"] or "").strip()
    if "columns" in update_dict:
        update_dict["columns"] = clean_columns(update_dict["columns"])
    active_columns = update_dict.get("columns", existing.get("columns", []))
    active_entries = existing.get("entries", [])
    if "entries" in update_dict:
        active_entries = normalise_entries(update_dict["entries"], active_columns)
        if len(active_entries) < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add at least one table result")
        update_dict["entries"] = active_entries
    if "die" in update_dict or "entries" in update_dict:
        update_dict["die"] = normalise_die(update_dict.get("die", existing.get("die")), active_entries)
    update_dict["updated_at"] = now_iso()

    await db.campaign_tables.update_one(
        {"id": table_id, "campaign_id": campaign_id},
        {"$set": update_dict},
    )
    table = await db.campaign_tables.find_one({"id": table_id, "campaign_id": campaign_id}, {"_id": 0})
    return normalise_table_document(table)


@router.delete("/campaigns/{campaign_id}/tables/{table_id}")
async def delete_campaign_table(campaign_id: str, table_id: str, username: str = Depends(get_current_user)):
    """Delete one campaign table. This does not delete notes, combat, lore, maps, NPCs, or locations."""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.campaign_tables.delete_one({"id": table_id, "campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return {"message": "Table deleted successfully"}
