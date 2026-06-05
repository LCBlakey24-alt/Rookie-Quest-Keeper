"""Handouts routes: GM creates and shares text/note handouts with players."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership, verify_campaign_membership
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

router = APIRouter()


@router.post("/campaigns/{campaign_id}/handouts")
async def create_handout(
    campaign_id: str,
    data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """GM creates a handout (title + content text)."""
    await verify_campaign_ownership(campaign_id, current_user)
    if not data.get('title', '').strip():
        raise HTTPException(status_code=400, detail="title is required")
    handout = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'title': data['title'].strip(),
        'content': data.get('content', '').strip(),
        'image_url': data.get('image_url', ''),
        'shared_with': [],   # list of usernames; empty = not yet shared
        'created_by': current_user,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.handouts.insert_one(handout)
    handout.pop('_id', None)
    return handout


@router.get("/campaigns/{campaign_id}/handouts")
async def list_handouts(campaign_id: str, current_user: str = Depends(get_current_user)):
    """GM views all handouts for a campaign."""
    await verify_campaign_ownership(campaign_id, current_user)
    items = await db.handouts.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(200)
    return items


@router.delete("/campaigns/{campaign_id}/handouts/{handout_id}")
async def delete_handout(campaign_id: str, handout_id: str, current_user: str = Depends(get_current_user)):
    """GM deletes a handout."""
    await verify_campaign_ownership(campaign_id, current_user)
    result = await db.handouts.delete_one({'id': handout_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Handout not found")
    return {"message": "Handout deleted"}


@router.post("/campaigns/{campaign_id}/handouts/{handout_id}/share")
async def share_handout(
    campaign_id: str,
    handout_id: str,
    data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """GM shares a handout with specific players (or whole campaign)."""
    await verify_campaign_ownership(campaign_id, current_user)
    handout = await db.handouts.find_one({'id': handout_id, 'campaign_id': campaign_id})
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    recipients = data.get('recipients', [])   # list of usernames; empty = all members
    if not recipients:
        # Share with all campaign members
        members = await db.campaign_members.find({'campaign_id': campaign_id}, {'_id': 0, 'user_id': 1}).to_list(100)
        recipients = [m['user_id'] for m in members if m.get('user_id')]

    # Create delivery records
    now = datetime.now(timezone.utc).isoformat()
    for username in recipients:
        existing = await db.player_handouts.find_one({'handout_id': handout_id, 'username': username})
        if not existing:
            await db.player_handouts.insert_one({
                'id': str(uuid.uuid4()),
                'handout_id': handout_id,
                'campaign_id': campaign_id,
                'username': username,
                'title': handout['title'],
                'content': handout.get('content', ''),
                'image_url': handout.get('image_url', ''),
                'read': False,
                'sent_at': now,
            })

    await db.handouts.update_one(
        {'id': handout_id},
        {'$set': {'shared_with': list(set(handout.get('shared_with', []) + recipients)), 'updated_at': now}}
    )
    return {"message": f"Shared with {len(recipients)} player(s)"}


@router.get("/player/handouts")
async def get_player_handouts(current_user: str = Depends(get_current_user)):
    """Player views handouts received from GMs."""
    items = await db.player_handouts.find(
        {'username': current_user},
        {'_id': 0}
    ).sort('sent_at', -1).to_list(100)
    return items


@router.patch("/player/handouts/{handout_id}/read")
async def mark_handout_read(handout_id: str, current_user: str = Depends(get_current_user)):
    """Player marks a handout as read."""
    result = await db.player_handouts.update_one(
        {'handout_id': handout_id, 'username': current_user},
        {'$set': {'read': True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Handout not found")
    return {"message": "Marked as read"}
