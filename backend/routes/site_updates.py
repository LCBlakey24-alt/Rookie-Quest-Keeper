"""Site update routes for dashboard announcements managed from Admin."""
from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from config import ADMIN_USERNAMES, db
from utils.auth import get_current_user

router = APIRouter()


class SiteUpdatePayload(BaseModel):
    label: str = Field(default="Update", max_length=60)
    title: str = Field(..., min_length=3, max_length=140)
    text: str = Field(..., min_length=10, max_length=1200)
    is_published: bool = False
    is_pinned: bool = False


async def verify_admin(username: str):
    admins = {name.lower() for name in ADMIN_USERNAMES}
    if not username or username.lower() not in admins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def safe_site_update(doc: Optional[dict]) -> dict:
    safe = dict(doc or {})
    safe.pop('_id', None)
    safe.setdefault('id', '')
    safe.setdefault('label', 'Update')
    safe.setdefault('title', '')
    safe.setdefault('text', '')
    safe.setdefault('is_published', False)
    safe.setdefault('is_pinned', False)
    safe.setdefault('created_at', '')
    safe.setdefault('updated_at', '')
    safe.setdefault('published_at', None)
    safe.setdefault('created_by', '')
    safe.setdefault('updated_by', '')
    return safe


def build_site_update_patch(payload: SiteUpdatePayload, username: str, now: str, existing: Optional[dict] = None) -> dict:
    label = payload.label.strip() or 'Update'
    title = payload.title.strip()
    text = payload.text.strip()

    if not title:
        raise HTTPException(status_code=400, detail="Site update title is required")
    if not text:
        raise HTTPException(status_code=400, detail="Site update text is required")

    existing = existing or {}
    published_at = existing.get('published_at')
    if payload.is_published and not published_at:
        published_at = now
    if not payload.is_published:
        published_at = None

    return {
        'label': label[:60],
        'title': title[:140],
        'text': text[:1200],
        'is_published': payload.is_published,
        'is_pinned': payload.is_pinned,
        'published_at': published_at,
        'updated_by': username,
        'updated_at': now,
    }


@router.get("/site-updates")
async def get_public_site_updates(limit: int = 6):
    safe_limit = max(1, min(limit, 12))
    updates = await db.site_updates.find(
        {'is_published': True},
        {'_id': 0}
    ).sort([('is_pinned', -1), ('published_at', -1), ('updated_at', -1)]).to_list(safe_limit)
    return [safe_site_update(update) for update in updates]


@router.get("/admin/site-updates")
async def get_admin_site_updates(username: str = Depends(get_current_user)):
    await verify_admin(username)
    updates = await db.site_updates.find({}, {'_id': 0}).sort([('is_pinned', -1), ('updated_at', -1)]).to_list(200)
    return [safe_site_update(update) for update in updates]


@router.post("/admin/site-updates")
async def create_admin_site_update(payload: SiteUpdatePayload, username: str = Depends(get_current_user)):
    await verify_admin(username)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        'id': str(uuid.uuid4()),
        'created_by': username,
        'created_at': now,
        **build_site_update_patch(payload, username, now),
    }
    await db.site_updates.insert_one(doc)
    return safe_site_update(doc)


@router.put("/admin/site-updates/{update_id}")
async def update_admin_site_update(update_id: str, payload: SiteUpdatePayload, username: str = Depends(get_current_user)):
    await verify_admin(username)
    existing = await db.site_updates.find_one({'id': update_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Site update not found")

    now = datetime.now(timezone.utc).isoformat()
    patch = build_site_update_patch(payload, username, now, existing)
    result = await db.site_updates.update_one({'id': update_id}, {'$set': patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Site update not found")

    doc = await db.site_updates.find_one({'id': update_id}, {'_id': 0})
    return safe_site_update(doc)
