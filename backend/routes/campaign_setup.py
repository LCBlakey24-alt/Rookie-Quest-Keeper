"""Campaign setup routes that keep creation simple but store launch context."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db
from utils.auth import get_current_user
from models import Campaign, CampaignInvite
from typing import Dict, Any, List
from datetime import datetime, timezone
import secrets
import string

router = APIRouter()

JOIN_CODE_ALPHABET = string.ascii_uppercase + string.digits
VALID_RULES_EDITIONS = {'2014', '2024'}
VALID_JOIN_MODES = {'auto_accept', 'gm_approval'}
VALID_VISIBILITY = {'private', 'public'}
VALID_CAMPAIGN_TYPES = {
    'fantasy', 'sci_fi', 'horror', 'noir', 'modern',
    'superhero', 'post_apocalyptic', 'mixed_other'
}


def clean_text(value: Any, default: str = '') -> str:
    text = str(value or '').strip()
    return text if text else default


def clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(maximum, number))


def generate_join_code() -> str:
    return ''.join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(6))


async def create_unique_join_code() -> str:
    for _ in range(20):
        code = generate_join_code()
        existing = await db.campaign_invites.find_one({'code': code}, {'_id': 1})
        if not existing:
            return code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Could not generate a join code')


async def site_flag_enabled(flag_name: str, default: bool = True) -> bool:
    doc = await db.site_settings.find_one({'id': 'global'}, {'_id': 0, flag_name: 1}) or {}
    return bool(doc.get(flag_name, default))


async def attach_campaign_counts(campaigns: List[dict]) -> List[dict]:
    campaign_ids = [campaign.get('id') for campaign in campaigns if campaign.get('id')]
    if not campaign_ids:
        return campaigns

    members = await db.campaign_members.find(
        {'campaign_id': {'$in': campaign_ids}},
        {'_id': 0, 'campaign_id': 1, 'character_id': 1, 'status': 1}
    ).to_list(5000)

    counts = {
        campaign_id: {
            'player_count': 0,
            'linked_character_count': 0,
            'pending_approval_count': 0,
        }
        for campaign_id in campaign_ids
    }

    for member in members:
        campaign_id = member.get('campaign_id')
        if campaign_id not in counts:
            continue
        member_status = str(member.get('status') or 'active').lower()
        if member_status == 'removed':
            continue
        counts[campaign_id]['player_count'] += 1
        if member.get('character_id'):
            counts[campaign_id]['linked_character_count'] += 1
        if member_status == 'pending':
            counts[campaign_id]['pending_approval_count'] += 1

    for campaign in campaigns:
        campaign.update(counts.get(campaign.get('id'), {}))
    return campaigns


@router.post('/campaigns', status_code=status.HTTP_201_CREATED)
async def create_campaign(campaign_data: Dict[str, Any], username: str = Depends(get_current_user)):
    """Create a campaign, save setup context, and automatically create its join code."""
    if not await site_flag_enabled('campaign_creation_enabled', True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Campaign creation is currently disabled')

    name = clean_text(campaign_data.get('name'))
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Campaign name is required')

    rules_edition = clean_text(campaign_data.get('rules_edition'), '2024')
    if rules_edition not in VALID_RULES_EDITIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Rules edition must be 2014 or 2024')

    campaign_type = clean_text(campaign_data.get('campaign_type') or campaign_data.get('world_genre'), 'fantasy')
    if campaign_type not in VALID_CAMPAIGN_TYPES:
        campaign_type = 'mixed_other'

    join_mode = clean_text(campaign_data.get('join_mode'), 'gm_approval')
    if join_mode not in VALID_JOIN_MODES:
        join_mode = 'gm_approval'

    visibility = clean_text(campaign_data.get('visibility'), 'private')
    if visibility not in VALID_VISIBILITY:
        visibility = 'private'

    allow_epic_levels = bool(campaign_data.get('allow_epic_levels', False))
    max_character_level = clamp_int(campaign_data.get('max_character_level'), 20, 1, 60)
    if not allow_epic_levels:
        max_character_level = min(max_character_level, 20)

    available_classes = [
        str(class_name).strip()
        for class_name in campaign_data.get('available_classes', [])
        if str(class_name).strip()
    ] if isinstance(campaign_data.get('available_classes'), list) else []

    system = clean_text(
        campaign_data.get('system'),
        'D&D 5e 2024 Compatible' if rules_edition == '2024' else 'D&D 5e 2014 Compatible'
    )

    now = datetime.now(timezone.utc).isoformat()
    campaign_obj = Campaign(
        dm_user_id=username,
        name=name,
        description=clean_text(campaign_data.get('description')),
        system=system,
        rules_edition=rules_edition,
        world_name=clean_text(campaign_data.get('world_name')),
        world_genre=campaign_type,
        world_setting=clean_text(campaign_data.get('world_setting'), 'custom'),
        world_setting_notes=clean_text(campaign_data.get('world_setting_notes')),
        allow_exploding_dice=bool(campaign_data.get('allow_exploding_dice', False)),
        allow_epic_levels=allow_epic_levels,
        max_character_level=max_character_level,
        available_classes=available_classes,
    )
    doc = campaign_obj.model_dump()
    doc.update({
        'campaign_type': campaign_type,
        'tone_preset': clean_text(campaign_data.get('tone_preset'), 'heroic_fantasy'),
        'tone_sliders': campaign_data.get('tone_sliders') if isinstance(campaign_data.get('tone_sliders'), dict) else {},
        'campaign_feel': clean_text(campaign_data.get('campaign_feel')),
        'starting_level': clamp_int(campaign_data.get('starting_level'), 1, 1, 20),
        'party_size': clamp_int(campaign_data.get('party_size'), 4, 1, 12),
        'visibility': visibility,
        'join_mode': join_mode,
        'join_code_enabled': True,
        'player_count': 0,
        'linked_character_count': 0,
        'pending_approval_count': 0,
        'updated_at': now,
    })

    await db.campaigns.insert_one(doc)

    invite_obj = CampaignInvite(
        campaign_id=doc['id'],
        created_by=username,
        code=await create_unique_join_code(),
        expires_at=None,
        max_uses=None,
    )
    invite = invite_obj.model_dump()
    await db.campaign_invites.insert_one(invite)

    return {**doc, 'join_code_created': True}


@router.get('/campaigns')
async def get_campaigns(username: str = Depends(get_current_user)):
    campaigns = await db.campaigns.find({'dm_user_id': username}, {'_id': 0}).to_list(1000)
    return await attach_campaign_counts(campaigns)


@router.get('/campaigns/{campaign_id}')
async def get_campaign(campaign_id: str, username: str = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Campaign not found')
    enriched = await attach_campaign_counts([campaign])
    return enriched[0]
