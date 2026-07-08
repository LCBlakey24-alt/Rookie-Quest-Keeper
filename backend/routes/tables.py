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


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def normalise_entries(entries: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    cleaned: List[Dict[str, str]] = []
    for index, entry in enumerate(entries, start=1):
        text = str(entry.get("text") or entry.get("result") or entry.get("description") or "").strip()
        if not text:
            continue
        cleaned.append({
            "range": normalise_range(entry.get("range") or entry.get("roll"), index),
            "text": text,
        })
    cleaned.sort(key=lambda item: entry_max(item["range"].split("-")[0]))
    return cleaned[:200]


class CampaignTableCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    category: str = "general"
    description: str = ""
    die: str = "d20"
    entries: List[Dict[str, Any]] = []
    is_player_safe: bool = False
    source: str = "custom"


class CampaignTableUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    category: Optional[str] = None
    description: Optional[str] = None
    die: Optional[str] = None
    entries: Optional[List[Dict[str, Any]]] = None
    is_player_safe: Optional[bool] = None
    source: Optional[str] = None


class CampaignTable(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    name: str
    category: str = "general"
    description: str = ""
    die: str = "d20"
    entries: List[Dict[str, str]] = []
    is_player_safe: bool = False
    source: str = "custom"
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


@router.get("/campaigns/{campaign_id}/tables", response_model=List[CampaignTable])
async def list_campaign_tables(campaign_id: str, username: str = Depends(get_current_user)):
    """List tables attached to a campaign for GM prep and live-session use."""
    await verify_campaign_membership(campaign_id, username)
    tables = await db.campaign_tables.find({"campaign_id": campaign_id}, {"_id": 0}).sort("name", 1).to_list(1000)
    return tables


@router.post("/campaigns/{campaign_id}/tables", response_model=CampaignTable)
async def create_campaign_table(campaign_id: str, table_data: CampaignTableCreate, username: str = Depends(get_current_user)):
    """Create a reusable campaign table without touching any existing campaign lore."""
    await verify_campaign_ownership(campaign_id, username)
    entries = normalise_entries(table_data.entries)
    if len(entries) < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add at least one table result")
    sides = max(20, max(entry_max(entry["range"]) for entry in entries))
    die = table_data.die.strip() if table_data.die and table_data.die.strip() else f"d{sides}"
    table = CampaignTable(
        campaign_id=campaign_id,
        name=table_data.name.strip(),
        category=(table_data.category or "general").strip().lower(),
        description=table_data.description.strip(),
        die=die,
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
    update_dict = {key: value for key, value in table_data.model_dump().items() if value is not None}
    if "name" in update_dict:
        update_dict["name"] = str(update_dict["name"]).strip()
    if "category" in update_dict:
        update_dict["category"] = str(update_dict["category"] or "general").strip().lower()
    if "description" in update_dict:
        update_dict["description"] = str(update_dict["description"] or "").strip()
    if "entries" in update_dict:
        entries = normalise_entries(update_dict["entries"])
        if len(entries) < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add at least one table result")
        update_dict["entries"] = entries
        if not update_dict.get("die"):
            update_dict["die"] = f"d{max(20, max(entry_max(entry['range']) for entry in entries))}"
    update_dict["updated_at"] = now_iso()

    result = await db.campaign_tables.update_one(
        {"id": table_id, "campaign_id": campaign_id},
        {"$set": update_dict},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    table = await db.campaign_tables.find_one({"id": table_id, "campaign_id": campaign_id}, {"_id": 0})
    return table


@router.delete("/campaigns/{campaign_id}/tables/{table_id}")
async def delete_campaign_table(campaign_id: str, table_id: str, username: str = Depends(get_current_user)):
    """Delete one campaign table. This does not delete notes, combat, lore, maps, NPCs, or locations."""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.campaign_tables.delete_one({"id": table_id, "campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return {"message": "Table deleted successfully"}
