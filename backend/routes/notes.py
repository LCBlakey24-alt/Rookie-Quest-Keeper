"""Notes routes: in-game notes, session recap, player notes, timeline."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import (
    get_current_user, verify_campaign_ownership, verify_campaign_membership,
    check_premium_feature, increment_ai_usage
)
from utils.helpers import get_campaign_context
from models import (
    InGameNote, InGameNoteCreate, SessionRecap, PlayerNote,
    PlayerNoteCreate, PlayerNoteUpdate, TimelineEvent, TimelineEventCreate, GMNoteSync
)
from typing import Optional, List
import uuid
from datetime import datetime, timezone
from utils.llm_provider import LlmChat, UserMessage, get_llm_api_key

router = APIRouter()

@router.post("/campaigns/{campaign_id}/ingame-notes", response_model=InGameNote, status_code=status.HTTP_201_CREATED)
async def create_ingame_note(campaign_id: str, note_data: InGameNoteCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    note_dict = note_data.model_dump()
    if not note_dict.get('session_date'):
        note_dict['session_date'] = datetime.now(timezone.utc).isoformat()
    
    note_obj = InGameNote(campaign_id=campaign_id, **note_dict)
    doc = note_obj.model_dump()
    await db.ingame_notes.insert_one(doc)
    return note_obj

@router.get("/campaigns/{campaign_id}/ingame-notes", response_model=List[InGameNote])
async def get_ingame_notes(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    notes = await db.ingame_notes.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return notes

@router.delete("/campaigns/{campaign_id}/ingame-notes/{note_id}")
async def delete_ingame_note(campaign_id: str, note_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.ingame_notes.delete_one({'id': note_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return {'message': 'Note deleted successfully'}

# ==================== SESSION RECAP & PLAYER NOTES ROUTES ====================

@router.post("/campaigns/{campaign_id}/session-recaps")
async def generate_and_sync_session_recap(campaign_id: str, username: str = Depends(get_current_user)):
    """
    GM generates a session recap from notes and syncs it to all players in the campaign.
    This reads ingame-notes, generates AI recap, and saves to all linked players.
    """
    await verify_campaign_ownership(campaign_id, username)
    
    # Get campaign details
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get all ingame notes
    notes = await db.ingame_notes.find(
        {'campaign_id': campaign_id}, 
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    if not notes:
        raise HTTPException(status_code=400, detail="No notes available to summarize")
    
    # Generate recap using AI
    notes_text = "\n\n".join([
        f"[{note.get('session_date', note.get('created_at', 'Unknown'))}] {note['content']}" 
        for note in notes
    ])
    
    prompt = f"""You are a fantasy storyteller. Based on these tabletop RPG session notes, create an engaging narrative recap that could be read aloud at the start of the next session. Write it in second person ("You") addressing the party.

Session Notes:
{notes_text}

Create a vivid, dramatic recap (2-4 paragraphs) that:
- Summarizes key events in narrative form
- Mentions important NPCs, locations, and discoveries
- Ends with a hook or question to build anticipation
- Uses evocative fantasy language

Write the recap now:"""

    try:
        # Check AI usage limit
        can_use_ai = await check_premium_feature(username, 'ai')
        if not can_use_ai:
            raise HTTPException(
                status_code=402, 
                detail="AI usage limit reached. Upgrade to Adventurer for unlimited AI generations."
            )
        
        llm_chat = LlmChat(
            api_key=get_llm_api_key("openai"),
            session_id=f"session-recap-{campaign_id}",
            system_message="You are a creative fantasy storyteller who writes engaging session recaps for tabletop RPG groups."
        )
        llm_chat.with_model('openai', 'gpt-4o-mini')
        
        user_message = UserMessage(text=prompt)
        response = await llm_chat.send_message(user_message)
        recap_content = response
        
        await increment_ai_usage(username)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI recap generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recap")
    
    # Find all players linked to this campaign via their characters
    player_characters = await db.player_characters.find(
        {'campaign_id': campaign_id},
        {'_id': 0, 'user_id': 1}
    ).to_list(100)
    
    # Get unique player user_ids
    player_user_ids = list(set([char['user_id'] for char in player_characters if char.get('user_id')]))
    
    # Create session recap for each player
    session_date = datetime.now(timezone.utc).isoformat()
    recaps_created = 0
    
    for player_user_id in player_user_ids:
        recap = SessionRecap(
            campaign_id=campaign_id,
            campaign_name=campaign.get('name', 'Unknown Campaign'),
            user_id=player_user_id,
            content=recap_content,
            session_date=session_date,
            created_by=username
        )
        await db.session_recaps.insert_one(recap.model_dump())
        recaps_created += 1
    
    return {
        "message": f"Recap generated and synced to {recaps_created} players!",
        "recap": recap_content,
        "players_synced": recaps_created
    }


@router.get("/player/session-recaps")
async def get_player_session_recaps(username: str = Depends(get_current_user)):
    """Get all session recaps shared with the current player"""
    recaps = await db.session_recaps.find(
        {'user_id': username},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return recaps


@router.get("/player/notes")
async def get_player_notes(username: str = Depends(get_current_user)):
    """Get all personal notes created by the player"""
    notes = await db.player_notes.find(
        {'user_id': username},
        {'_id': 0}
    ).sort('updated_at', -1).to_list(100)
    return notes


@router.post("/player/notes", status_code=status.HTTP_201_CREATED)
async def create_player_note(note_data: PlayerNoteCreate, username: str = Depends(get_current_user)):
    """Create a personal player note"""
    campaign_name = None
    if note_data.campaign_id:
        campaign = await db.campaigns.find_one({'id': note_data.campaign_id}, {'_id': 0, 'name': 1})
        if campaign:
            campaign_name = campaign.get('name')
    
    note = PlayerNote(
        user_id=username,
        campaign_id=note_data.campaign_id,
        campaign_name=campaign_name,
        title=note_data.title,
        content=note_data.content
    )
    await db.player_notes.insert_one(note.model_dump())
    return note.model_dump()


@router.put("/player/notes/{note_id}")
async def update_player_note(note_id: str, note_data: PlayerNoteUpdate, username: str = Depends(get_current_user)):
    """Update a personal player note"""
    update_dict = {k: v for k, v in note_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.player_notes.update_one(
        {'id': note_id, 'user_id': username},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = await db.player_notes.find_one({'id': note_id}, {'_id': 0})
    return note


@router.delete("/player/notes/{note_id}")
async def delete_player_note(note_id: str, username: str = Depends(get_current_user)):
    """Delete a personal player note"""
    result = await db.player_notes.delete_one({'id': note_id, 'user_id': username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {'message': 'Note deleted successfully'}


# ==================== CAMPAIGN TIMELINE ====================

@router.get("/campaigns/{campaign_id}/timeline")
async def get_campaign_timeline(campaign_id: str, username: str = Depends(get_current_user)):
    """Get timeline events for a campaign (accessible to GMs and linked players)"""
    # Check if user is GM or has character in campaign
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'owner_id': 1})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    is_gm = campaign.get('owner_id') == username
    has_character = await db.player_characters.find_one({'campaign_id': campaign_id, 'user_id': username})
    
    if not is_gm and not has_character:
        raise HTTPException(status_code=403, detail="You must be the GM or have a character in this campaign")
    
    events = await db.timeline_events.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('timestamp', -1).to_list(200)
    
    return events


@router.post("/campaigns/{campaign_id}/timeline", status_code=status.HTTP_201_CREATED)
async def create_timeline_event(campaign_id: str, event_data: TimelineEventCreate, username: str = Depends(get_current_user)):
    """GM creates a timeline event"""
    await verify_campaign_ownership(campaign_id, username)
    
    event = TimelineEvent(
        campaign_id=campaign_id,
        event_type=event_data.event_type,
        title=event_data.title,
        description=event_data.description,
        session_number=event_data.session_number,
        related_npc_id=event_data.related_npc_id,
        related_location_id=event_data.related_location_id,
        related_character_ids=event_data.related_character_ids,
        created_by=username
    )
    
    await db.timeline_events.insert_one(event.model_dump())
    return event.model_dump()


@router.post("/campaigns/{campaign_id}/sync-note")
async def sync_gm_note_to_players(campaign_id: str, note_data: GMNoteSync, username: str = Depends(get_current_user)):
    """
    GM syncs a note to specific players or all players in campaign.
    Optionally creates a timeline event.
    """
    await verify_campaign_ownership(campaign_id, username)
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'name': 1})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get target characters - either specified or all in campaign
    if note_data.target_character_ids:
        characters = await db.player_characters.find(
            {'id': {'$in': note_data.target_character_ids}, 'campaign_id': campaign_id},
            {'_id': 0, 'id': 1, 'user_id': 1, 'name': 1}
        ).to_list(100)
    else:
        characters = await db.player_characters.find(
            {'campaign_id': campaign_id},
            {'_id': 0, 'id': 1, 'user_id': 1, 'name': 1}
        ).to_list(100)
    
    if not characters:
        return {"message": "No characters found in campaign to sync", "synced_count": 0}
    
    # Create player notes for each unique user
    unique_users = {}
    for char in characters:
        user_id = char.get('user_id')
        if user_id and user_id not in unique_users:
            unique_users[user_id] = char.get('name', 'Unknown')
    
    notes_created = 0
    for user_id, char_name in unique_users.items():
        note = PlayerNote(
            user_id=user_id,
            campaign_id=campaign_id,
            campaign_name=campaign.get('name', 'Unknown'),
            title=note_data.title or f"GM Note - {note_data.note_type.replace('_', ' ').title()}",
            content=note_data.note_content
        )
        await db.player_notes.insert_one(note.model_dump())
        notes_created += 1
    
    # Create timeline event if requested
    timeline_event_id = None
    if note_data.create_timeline_event:
        event = TimelineEvent(
            campaign_id=campaign_id,
            event_type=note_data.note_type,
            title=note_data.title or "GM Update",
            description=note_data.note_content[:200] + "..." if len(note_data.note_content) > 200 else note_data.note_content,
            related_character_ids=[c['id'] for c in characters],
            created_by=username
        )
        await db.timeline_events.insert_one(event.model_dump())
        timeline_event_id = event.id
    
    return {
        "message": f"Note synced to {notes_created} players",
        "synced_count": notes_created,
        "timeline_event_id": timeline_event_id
    }


@router.get("/player/timeline")
async def get_player_timeline(username: str = Depends(get_current_user)):
    """Get all timeline events from campaigns the player is part of"""
    # Find all campaigns the player has characters in
    characters = await db.player_characters.find(
        {'user_id': username},
        {'_id': 0, 'campaign_id': 1}
    ).to_list(100)
    
    campaign_ids = list(set([c['campaign_id'] for c in characters if c.get('campaign_id')]))
    
    if not campaign_ids:
        return []
    
    events = await db.timeline_events.find(
        {'campaign_id': {'$in': campaign_ids}},
        {'_id': 0}
    ).sort('timestamp', -1).to_list(200)
    
    return events


# ==================== PLAYER ROUTES ====================
