"""Player routes: CRUD for campaign players (GM-managed)."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership, verify_campaign_membership
from utils.player_views import player_campaign_summary, player_party_member, PARTY_FIELDS
from models import Player, PlayerCreate, PlayerUpdate, PlayerStats
from typing import List
import uuid
from datetime import datetime, timezone

router = APIRouter()


@router.get("/player/campaign/{campaign_id}")
async def get_player_campaign(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await verify_campaign_membership(campaign_id, username)
    projection = {'_id': 0, **{field: 1 for field in PARTY_FIELDS}}
    characters = await db.player_characters.find({'campaign_id': campaign_id}, projection).to_list(1000)
    legacy_players = await db.players.find({'campaign_id': campaign_id}, projection).to_list(1000)
    linked_names = {(item.get('name') or item.get('character_name') or '').casefold() for item in characters}
    party = characters + [item for item in legacy_players if (item.get('character_name') or item.get('name') or '').casefold() not in linked_names]
    return {**player_campaign_summary(campaign), 'party': [player_party_member(item) for item in party]}

@router.post("/campaigns/{campaign_id}/players", response_model=Player, status_code=status.HTTP_201_CREATED)
async def create_player(campaign_id: str, player_data: PlayerCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    player_dict = player_data.model_dump()
    if player_dict.get('stats') is None:
        player_dict['stats'] = PlayerStats().model_dump()
    player_obj = Player(campaign_id=campaign_id, **player_dict)
    doc = player_obj.model_dump()
    await db.players.insert_one(doc)
    return player_obj

@router.get("/campaigns/{campaign_id}/players", response_model=List[Player])
async def get_players(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    players = await db.players.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return players

@router.put("/campaigns/{campaign_id}/players/{player_id}", response_model=Player)
async def update_player(campaign_id: str, player_id: str, player_data: PlayerUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in player_data.model_dump().items() if v is not None}
    result = await db.players.update_one(
        {'id': player_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    
    player = await db.players.find_one({'id': player_id}, {'_id': 0})
    return player

@router.delete("/campaigns/{campaign_id}/players/{player_id}")
async def delete_player(campaign_id: str, player_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.players.delete_one({'id': player_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return {'message': 'Player deleted successfully'}

# ==================== NPC ROUTES ====================
