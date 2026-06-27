"""Story arc and chapter routes for GM campaign planning."""
from datetime import datetime, timezone
from typing import Any, Dict
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()


class StoryChapterPayload(BaseModel):
    title: str = Field(default="Untitled Chapter")
    session_number: str = ""
    status: str = "planned"
    summary: str = ""
    prep_notes: str = ""
    scenes: list[Dict[str, Any]] = Field(default_factory=list)


class StoryArcCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "planning"
    arc_type: str = "main"
    gm_notes: str = ""
    chapters: list[StoryChapterPayload] = Field(default_factory=list)


class StoryArcUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    arc_type: str | None = None
    gm_notes: str | None = None
    chapters: list[Dict[str, Any]] | None = None


class StoryChapterCreate(StoryChapterPayload):
    pass


class StoryChapterUpdate(BaseModel):
    title: str | None = None
    session_number: str | None = None
    status: str | None = None
    summary: str | None = None
    prep_notes: str | None = None
    scenes: list[Dict[str, Any]] | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalise_chapter(chapter: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": chapter.get("id") or f"chapter-{uuid4().hex}",
        "title": chapter.get("title") or "Untitled Chapter",
        "session_number": chapter.get("session_number") or "",
        "status": chapter.get("status") or "planned",
        "summary": chapter.get("summary") or "",
        "prep_notes": chapter.get("prep_notes") or "",
        "scenes": chapter.get("scenes") if isinstance(chapter.get("scenes"), list) else [],
        "created_at": chapter.get("created_at") or now_iso(),
        "updated_at": now_iso(),
    }


async def get_owned_arc(campaign_id: str, arc_id: str, username: str) -> Dict[str, Any]:
    await verify_campaign_ownership(campaign_id, username)
    arc = await db.story_arcs.find_one({"id": arc_id, "campaign_id": campaign_id}, {"_id": 0})
    if not arc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story arc not found")
    return arc


@router.get("/campaigns/{campaign_id}/story-arcs")
async def list_story_arcs(campaign_id: str, username: str = Depends(get_current_user)):
    """List story arcs for a GM-owned campaign."""
    await verify_campaign_ownership(campaign_id, username)
    return await db.story_arcs.find({"campaign_id": campaign_id}, {"_id": 0}).sort("created_at", 1).to_list(200)


@router.post("/campaigns/{campaign_id}/story-arcs")
async def create_story_arc(campaign_id: str, payload: StoryArcCreate, username: str = Depends(get_current_user)):
    """Create a story arc with optional starter chapters."""
    await verify_campaign_ownership(campaign_id, username)
    arc = payload.model_dump()
    arc.update({
        "id": f"arc-{uuid4().hex}",
        "campaign_id": campaign_id,
        "created_by": username,
        "chapters": [normalise_chapter(chapter) for chapter in arc.get("chapters", [])],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.story_arcs.insert_one(arc)
    arc.pop("_id", None)
    return arc


@router.put("/campaigns/{campaign_id}/story-arcs/{arc_id}")
async def update_story_arc(campaign_id: str, arc_id: str, payload: StoryArcUpdate, username: str = Depends(get_current_user)):
    """Update top-level arc details or replace its chapters."""
    await get_owned_arc(campaign_id, arc_id, username)
    update_data = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "chapters" in update_data:
        update_data["chapters"] = [normalise_chapter(chapter) for chapter in update_data["chapters"]]
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No story arc fields to update")
    update_data["updated_at"] = now_iso()
    await db.story_arcs.update_one({"id": arc_id, "campaign_id": campaign_id}, {"$set": update_data})
    return await get_owned_arc(campaign_id, arc_id, username)


@router.delete("/campaigns/{campaign_id}/story-arcs/{arc_id}")
async def delete_story_arc(campaign_id: str, arc_id: str, username: str = Depends(get_current_user)):
    """Delete a story arc and its chapters."""
    await verify_campaign_ownership(campaign_id, username)
    result = await db.story_arcs.delete_one({"id": arc_id, "campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story arc not found")
    return {"message": "Story arc deleted"}


@router.post("/campaigns/{campaign_id}/story-arcs/{arc_id}/chapters")
async def add_story_chapter(campaign_id: str, arc_id: str, payload: StoryChapterCreate, username: str = Depends(get_current_user)):
    """Add a chapter/session to a story arc."""
    arc = await get_owned_arc(campaign_id, arc_id, username)
    chapter = normalise_chapter(payload.model_dump())
    chapters = [*arc.get("chapters", []), chapter]
    await db.story_arcs.update_one(
        {"id": arc_id, "campaign_id": campaign_id},
        {"$set": {"chapters": chapters, "updated_at": now_iso()}},
    )
    return chapter


@router.put("/campaigns/{campaign_id}/story-arcs/{arc_id}/chapters/{chapter_id}")
async def update_story_chapter(campaign_id: str, arc_id: str, chapter_id: str, payload: StoryChapterUpdate, username: str = Depends(get_current_user)):
    """Update one chapter/session inside a story arc."""
    arc = await get_owned_arc(campaign_id, arc_id, username)
    update_data = {key: value for key, value in payload.model_dump().items() if value is not None}
    chapters = []
    found = False
    for chapter in arc.get("chapters", []):
      if chapter.get("id") == chapter_id:
          found = True
          chapters.append({**chapter, **update_data, "updated_at": now_iso()})
      else:
          chapters.append(chapter)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    await db.story_arcs.update_one(
        {"id": arc_id, "campaign_id": campaign_id},
        {"$set": {"chapters": chapters, "updated_at": now_iso()}},
    )
    return await get_owned_arc(campaign_id, arc_id, username)


@router.delete("/campaigns/{campaign_id}/story-arcs/{arc_id}/chapters/{chapter_id}")
async def delete_story_chapter(campaign_id: str, arc_id: str, chapter_id: str, username: str = Depends(get_current_user)):
    """Remove a chapter/session from a story arc."""
    arc = await get_owned_arc(campaign_id, arc_id, username)
    chapters = [chapter for chapter in arc.get("chapters", []) if chapter.get("id") != chapter_id]
    if len(chapters) == len(arc.get("chapters", [])):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    await db.story_arcs.update_one(
        {"id": arc_id, "campaign_id": campaign_id},
        {"$set": {"chapters": chapters, "updated_at": now_iso()}},
    )
    return {"message": "Chapter deleted"}
