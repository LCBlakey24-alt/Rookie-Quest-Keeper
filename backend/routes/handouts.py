"""Handouts routes: GM creates and shares notes, clues, items, and visual handouts with players."""
from fastapi import APIRouter, HTTPException, Depends
from config import db
from utils.auth import get_current_user, verify_campaign_ownership
from typing import List, Dict, Any
import uuid
from datetime import datetime, timezone

router = APIRouter()


async def _get_handout_recipients(campaign_id: str) -> List[Dict[str, str]]:
    """Return distinct player usernames that can receive handouts.

    Players may be linked through the current join-code character flow or older
    campaign_members records, so include both sources to make live handouts work
    for real campaigns regardless of how players joined.
    """
    recipients: Dict[str, Dict[str, str]] = {}

    members = await db.campaign_members.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(200)
    for member in members:
        username = str(member.get('username') or member.get('user_id') or '').strip()
        if username:
            recipients[username] = {
                'username': username,
                'display_name': member.get('username') or username,
                'source': 'campaign_member',
            }

    characters = await db.player_characters.find(
        {'campaign_id': campaign_id, 'user_id': {'$nin': [None, '']}},
        {'_id': 0, 'user_id': 1, 'name': 1}
    ).to_list(200)
    for character in characters:
        username = str(character.get('user_id') or '').strip()
        if username:
            existing = recipients.get(username, {})
            recipients[username] = {
                'username': username,
                'display_name': existing.get('display_name') or username,
                'character_name': character.get('name', ''),
                'source': 'linked_character' if not existing else existing.get('source', 'linked_character'),
            }

    return sorted(recipients.values(), key=lambda item: (item.get('display_name') or item['username']).lower())


@router.post("/campaigns/{campaign_id}/handouts")
async def create_handout(
    campaign_id: str,
    data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """GM creates a handout (title, type, content text, and optional uploaded image)."""
    await verify_campaign_ownership(campaign_id, current_user)
    if not data.get('title', '').strip():
        raise HTTPException(status_code=400, detail="title is required")
    handout = {
        'id': str(uuid.uuid4()),
        'campaign_id': campaign_id,
        'title': data['title'].strip(),
        'content': data.get('content', '').strip(),
        'category': str(data.get('category') or 'clue').strip().lower()[:40],
        'image_url': data.get('image_url', '') or (data.get('attachment_url', '') if str(data.get('attachment_type', '')).startswith('image/') else ''),
        'attachment_url': data.get('attachment_url', data.get('image_url', '')),
        'attachment_type': data.get('attachment_type', 'image/upload' if data.get('image_url') else ''),
        'attachment_name': data.get('attachment_name', ''),
        'allow_player_sharing': bool(data.get('allow_player_sharing', True)),
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
    handout_ids = [item.get('id') for item in items if item.get('id')]
    if not handout_ids:
        return items

    deliveries = await db.player_handouts.find(
        {'campaign_id': campaign_id, 'handout_id': {'$in': handout_ids}},
        {'_id': 0, 'handout_id': 1, 'username': 1, 'read': 1, 'sent_at': 1, 'read_at': 1}
    ).to_list(1000)
    by_handout: Dict[str, List[Dict[str, Any]]] = {}
    for delivery in deliveries:
        by_handout.setdefault(delivery.get('handout_id'), []).append(delivery)

    for item in items:
        delivery_status = sorted(
            by_handout.get(item.get('id'), []),
            key=lambda row: row.get('username', '').lower()
        )
        read_count = sum(1 for row in delivery_status if row.get('read'))
        item['delivery_status'] = delivery_status
        item['delivery_count'] = len(delivery_status)
        item['read_count'] = read_count
        item['unread_count'] = len(delivery_status) - read_count
    return items


@router.get("/campaigns/{campaign_id}/handout-recipients")
async def list_handout_recipients(campaign_id: str, current_user: str = Depends(get_current_user)):
    """GM lists players who can receive handouts."""
    await verify_campaign_ownership(campaign_id, current_user)
    recipients = await _get_handout_recipients(campaign_id)
    return {"recipients": recipients, "count": len(recipients)}


@router.put("/campaigns/{campaign_id}/handouts/{handout_id}")
async def update_handout(
    campaign_id: str,
    handout_id: str,
    data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """GM updates a handout and refreshes already-delivered player copies."""
    await verify_campaign_ownership(campaign_id, current_user)
    if not data.get('title', '').strip():
        raise HTTPException(status_code=400, detail="title is required")

    now = datetime.now(timezone.utc).isoformat()
    patch = {
        'title': data['title'].strip(),
        'content': data.get('content', '').strip(),
        'category': str(data.get('category') or 'clue').strip().lower()[:40],
        'image_url': data.get('image_url', '') or (data.get('attachment_url', '') if str(data.get('attachment_type', '')).startswith('image/') else ''),
        'attachment_url': data.get('attachment_url', data.get('image_url', '')),
        'attachment_type': data.get('attachment_type', 'image/upload' if data.get('image_url') else ''),
        'attachment_name': data.get('attachment_name', ''),
        'allow_player_sharing': bool(data.get('allow_player_sharing', True)),
        'updated_at': now,
    }
    result = await db.handouts.update_one(
        {'id': handout_id, 'campaign_id': campaign_id},
        {'$set': patch}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Handout not found")

    await db.player_handouts.update_many(
        {'handout_id': handout_id, 'campaign_id': campaign_id},
        {'$set': {**patch, 'read': False}, '$unset': {'read_at': ''}}
    )

    updated = await db.handouts.find_one({'id': handout_id, 'campaign_id': campaign_id}, {'_id': 0})
    return updated


@router.delete("/campaigns/{campaign_id}/handouts/{handout_id}")
async def delete_handout(campaign_id: str, handout_id: str, current_user: str = Depends(get_current_user)):
    """GM deletes a handout."""
    await verify_campaign_ownership(campaign_id, current_user)
    result = await db.handouts.delete_one({'id': handout_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Handout not found")
    deliveries = await db.player_handouts.delete_many({'handout_id': handout_id, 'campaign_id': campaign_id})
    return {"message": "Handout deleted", "deleted_deliveries": deliveries.deleted_count}


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

    recipients = [str(item).strip() for item in data.get('recipients', []) if str(item).strip()]
    allowed_recipients = await _get_handout_recipients(campaign_id)
    allowed_usernames = {item['username'] for item in allowed_recipients}
    if not recipients:
        recipients = sorted(allowed_usernames)
    else:
        recipients = [username for username in recipients if username in allowed_usernames]

    if not recipients:
        raise HTTPException(status_code=400, detail="No eligible players found to receive this handout")

    # Create or refresh delivery records
    now = datetime.now(timezone.utc).isoformat()
    for username in recipients:
        delivery_patch = {
            'handout_id': handout_id,
            'campaign_id': campaign_id,
            'username': username,
            'title': handout['title'],
            'content': handout.get('content', ''),
            'category': handout.get('category', 'clue'),
            'image_url': handout.get('image_url', ''),
            'attachment_url': handout.get('attachment_url', handout.get('image_url', '')),
            'attachment_type': handout.get('attachment_type', 'image/upload' if handout.get('image_url') else ''),
            'attachment_name': handout.get('attachment_name', ''),
            'allow_player_sharing': bool(handout.get('allow_player_sharing', True)),
            'read': False,
            'sent_at': now,
        }
        await db.player_handouts.update_one(
            {'handout_id': handout_id, 'username': username},
            {
                '$set': delivery_patch,
                '$setOnInsert': {'id': str(uuid.uuid4()), 'saved': False},
                '$unset': {'read_at': ''},
            },
            upsert=True,
        )

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


@router.get("/player/handouts/{handout_id}/share-options")
async def get_player_handout_share_options(handout_id: str, current_user: str = Depends(get_current_user)):
    """Player lists other campaign players they can share a received handout with."""
    handout = await db.player_handouts.find_one({'handout_id': handout_id, 'username': current_user})
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    if handout.get('allow_player_sharing') is False:
        raise HTTPException(status_code=403, detail="The GM has disabled player sharing for this handout")

    recipients = await _get_handout_recipients(handout.get('campaign_id', ''))
    visible = [item for item in recipients if item.get('username') != current_user]
    return {"recipients": visible, "count": len(visible)}


@router.patch("/player/handouts/{handout_id}/saved")
async def set_player_handout_saved(
    handout_id: str,
    data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """Player saves or unsaves a received handout for their clue/item log."""
    saved = bool(data.get('saved'))
    result = await db.player_handouts.update_one(
        {'handout_id': handout_id, 'username': current_user},
        {'$set': {'saved': saved, 'saved_at': datetime.now(timezone.utc).isoformat() if saved else None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Handout not found")
    return {"message": "Saved" if saved else "Unsaved", "saved": saved}


@router.post("/player/handouts/{handout_id}/share")
async def share_player_handout(
    handout_id: str,
    data: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """Player shares a received handout with selected eligible players in the same campaign."""
    handout = await db.player_handouts.find_one({'handout_id': handout_id, 'username': current_user})
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    if handout.get('allow_player_sharing') is False:
        raise HTTPException(status_code=403, detail="The GM has disabled player sharing for this handout")

    requested = [str(item).strip() for item in data.get('recipients', []) if str(item).strip()]
    if not requested:
        raise HTTPException(status_code=400, detail="Choose at least one player to share with")

    allowed = await _get_handout_recipients(handout.get('campaign_id', ''))
    allowed_usernames = {item['username'] for item in allowed if item.get('username') != current_user}
    recipients = [username for username in requested if username in allowed_usernames]
    if not recipients:
        raise HTTPException(status_code=400, detail="No eligible selected players found")

    now = datetime.now(timezone.utc).isoformat()
    created = 0
    for username in recipients:
        existing = await db.player_handouts.find_one({'handout_id': handout_id, 'username': username})
        if existing:
            continue
        await db.player_handouts.insert_one({
            'id': str(uuid.uuid4()),
            'handout_id': handout_id,
            'campaign_id': handout.get('campaign_id'),
            'username': username,
            'title': handout.get('title', 'Handout'),
            'content': handout.get('content', ''),
            'category': handout.get('category', 'clue'),
            'image_url': handout.get('image_url', ''),
            'attachment_url': handout.get('attachment_url', handout.get('image_url', '')),
            'attachment_type': handout.get('attachment_type', 'image/upload' if handout.get('image_url') else ''),
            'attachment_name': handout.get('attachment_name', ''),
            'allow_player_sharing': bool(handout.get('allow_player_sharing', True)),
            'read': False,
            'saved': False,
            'sent_at': now,
            'shared_by': current_user,
        })
        created += 1

    await db.player_handouts.update_one(
        {'handout_id': handout_id, 'username': current_user},
        {'$addToSet': {'shared_with': {'$each': recipients}}, '$set': {'last_shared_at': now}}
    )
    return {"message": f"Shared with {created} player(s)", "shared_count": created}


@router.patch("/player/handouts/{handout_id}/read")
async def mark_handout_read(handout_id: str, current_user: str = Depends(get_current_user)):
    """Player marks a handout as read."""
    result = await db.player_handouts.update_one(
        {'handout_id': handout_id, 'username': current_user},
        {'$set': {'read': True, 'read_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Handout not found")
    return {"message": "Marked as read"}
