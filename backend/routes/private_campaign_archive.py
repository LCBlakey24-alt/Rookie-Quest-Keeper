"""Owner-only recovery access to legacy GM campaign material.

Older personal campaign notes were incorrectly compiled into the public
frontend. Their original source files have been preserved in a separate
private MongoDB collection as an owner-scoped archive. Never evaluate source
text, seed it into new accounts, or expose it to campaign members.
"""
import re
from fastapi import APIRouter, Depends, HTTPException
from config import db
from utils.auth import get_current_user, verify_campaign_ownership

router = APIRouter()
ARCHIVE_SET = "tia-karta-20261109"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")


@router.get("/campaigns/{campaign_id}/private-source-archive")
async def list_private_campaign_archive(
    campaign_id: str, username: str = Depends(get_current_user)
):
    await verify_campaign_ownership(campaign_id, username)
    docs = await db.private_campaign_source_archives.find(
        {"owner_user_id": username, "archive_set": ARCHIVE_SET, "visibility": "private"},
        {"_id": 0, "path": 1, "source_blob_sha": 1, "source_format": 1,
         "archived_at": 1},
    ).sort("path", 1).to_list(100)
    return {"files": docs, "count": len(docs)}


@router.get("/campaigns/{campaign_id}/private-source-archive/{source_sha}")
async def get_private_campaign_archive(
    campaign_id: str, source_sha: str, username: str = Depends(get_current_user)
):
    await verify_campaign_ownership(campaign_id, username)
    if not SHA_RE.fullmatch(source_sha):
        raise HTTPException(status_code=404, detail="Private source not found")
    doc = await db.private_campaign_source_archives.find_one(
        {"owner_user_id": username, "archive_set": ARCHIVE_SET,
         "visibility": "private", "source_blob_sha": source_sha},
        {"_id": 0, "path": 1, "source_text": 1, "source_format": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Private source not found")
    # Return inert text only. Never execute/eval imported JavaScript.
    return doc
