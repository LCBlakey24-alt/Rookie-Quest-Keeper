"""Campaign invite code routes for GM sharing and player joining."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db
from utils.auth import get_current_user, verify_campaign_ownership
from models import CampaignInvite, CampaignMember
from typing import Dict, Any
from datetime import datetime, timezone
import secrets
import string

router = APIRouter()

JOIN_CODE_ALPHABET = string.ascii_uppercase + string.digits


def normalize_join_code(value: str) -> str:
    return ''.join(str(value or '').upper().strip().split())


def generate_join_code() -> str:
    return ''.join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(6))


async def create_unique_join_code() -> str:
    for _ in range(20):
        code = generate_join_code()
        existing = await db.campaign_invites.find_one({'code': code}, {'_id': 1})
        if not existing:
            return code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Could not generate a join code')


async def get_or_create_invite(campaign_id: str, username: str) -> dict:
    await verify_campaign_ownership(campaign_id, username)
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username}, {'_id': 0, 'id': 1, 'name': 1})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Campaign not found')

    invite = await db.campaign_invites.find_one({'campaign_id': campaign_id, 'created_by': username, 'expires_at': None}, {'_id': 0})
    if not invite:
        invite_obj = CampaignInvite(
            campaign_id=campaign_id,
            created_by=username,
            code=await create_unique_join_code(),
            expires_at=None,
            max_uses=None,
        )
        invite = invite_obj.model_dump()
        await db.campaign_invites.insert_one(invite)

    return {
        'campaign_id': campaign_id,
        'campaign_name': campaign.get('name', 'Untitled Campaign'),
        'join_code': invite.get('code'),
        'uses': invite.get('uses', 0),
        'created_at': invite.get('created_at'),
    }


@router.post('/campaign-invites/join')
async def join_campaign_by_code(join_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Join a campaign using a GM join code and optionally link a character."""
    code = normalize_join_code(join_data.get('join_code') or join_data.get('invite_code') or join_data.get('code'))
    character_id = str(join_data.get('character_id') or '').strip()

    if len(code) != 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Join code must be 6 characters')

    invite = await db.campaign_invites.find_one({'code': code}, {'_id': 0})
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Invalid join code')

    if invite.get('expires_at'):
        try:
            expires_at = datetime.fromisoformat(invite['expires_at'])
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invite has expired')
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invite has expired')

    if invite.get('max_uses') and invite.get('uses', 0) >= invite['max_uses']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invite has reached max uses')

    campaign_id = invite.get('campaign_id')
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Campaign not found')

    if campaign.get('dm_user_id') == username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='You are already the GM of this campaign')

    character = None
    if character_id:
        character = await db.player_characters.find_one({'id': character_id, 'user_id': username}, {'_id': 0})
        if not character:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Character not found')
        await db.player_characters.update_one(
            {'id': character_id, 'user_id': username},
            {'$set': {
                'campaign_id': campaign_id,
                'campaign_name': campaign.get('name', 'Untitled Campaign'),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }}
        )

    existing_member = await db.campaign_members.find_one({'campaign_id': campaign_id, 'user_id': username}, {'_id': 0})
    if existing_member:
        update_data = {'username': username}
        if character_id:
            update_data['character_id'] = character_id
        await db.campaign_members.update_one({'id': existing_member.get('id')}, {'$set': update_data})
    else:
        member = CampaignMember(
            campaign_id=campaign_id,
            user_id=username,
            username=username,
            character_id=character_id or None,
        )
        await db.campaign_members.insert_one(member.model_dump())
        await db.campaign_invites.update_one({'code': code}, {'$inc': {'uses': 1}})

    return {
        'message': 'Successfully joined campaign',
        'campaign': {
            'id': campaign_id,
            'name': campaign.get('name', 'Untitled Campaign'),
            'dm_user_id': campaign.get('dm_user_id'),
            'system': campaign.get('system'),
            'rules_edition': campaign.get('rules_edition'),
        },
        'character': {
            'id': character_id,
            'name': character.get('name') if character else '',
        } if character_id else None,
    }


@router.get('/campaign-invites/joined/list')
async def get_joined_campaigns(username: str = Depends(get_current_user)):
    """List campaigns the current user has joined as a player."""
    memberships = await db.campaign_members.find({'user_id': username}, {'_id': 0}).to_list(100)
    campaign_ids = [member.get('campaign_id') for member in memberships if member.get('campaign_id')]
    if not campaign_ids:
        return []
    campaigns = await db.campaigns.find({'id': {'$in': campaign_ids}}, {'_id': 0}).to_list(100)
    membership_by_campaign = {member.get('campaign_id'): member for member in memberships}
    for campaign in campaigns:
        member = membership_by_campaign.get(campaign.get('id'), {})
        campaign['member_role'] = member.get('role', 'player')
        campaign['character_id'] = member.get('character_id')
    return campaigns


@router.get('/campaign-invites/{campaign_id}')
async def get_campaign_invite(campaign_id: str, username: str = Depends(get_current_user)):
    """Get or create the current campaign join code. GM only."""
    return await get_or_create_invite(campaign_id, username)


@router.post('/campaign-invites/{campaign_id}')
async def rotate_campaign_invite(campaign_id: str, username: str = Depends(get_current_user)):
    """Create a fresh join code for a campaign. GM only."""
    await verify_campaign_ownership(campaign_id, username)
    await db.campaign_invites.delete_many({'campaign_id': campaign_id, 'created_by': username, 'expires_at': None})
    invite_obj = CampaignInvite(
        campaign_id=campaign_id,
        created_by=username,
        code=await create_unique_join_code(),
        expires_at=None,
        max_uses=None,
    )
    invite = invite_obj.model_dump()
    await db.campaign_invites.insert_one(invite)
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'name': 1}) or {}
    return {
        'campaign_id': campaign_id,
        'campaign_name': campaign.get('name', 'Untitled Campaign'),
        'join_code': invite.get('code'),
        'uses': 0,
        'created_at': invite.get('created_at'),
    }


