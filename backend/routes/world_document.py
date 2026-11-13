"""The campaign world document: download the template, upload a filled copy
for Rook to read into drafts, then save the drafts the GM chose.

Draft first: reading a document never writes anything. Saving is a separate
call with only the items the GM ticked, and it is idempotent: a place, person
or quest whose name is already in the campaign is skipped, and a block of
world text already in the World Setting is not added twice. Nothing is
invented; every saved field is text the GM (or their AI assistant, at their
request) wrote in the document.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import db
from models import NPC, NPCStats, Location
from routes.quests import normalise_objective
from utils.auth import get_current_user, verify_campaign_ownership
from utils.world_document import (
    MAX_DOCUMENT_BYTES,
    build_world_template,
    mark_existing,
    normalise_name,
    parse_world_document,
)

router = APIRouter()

DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _existing_names(campaign_id: str) -> Dict[str, List[str]]:
    locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0, 'name': 1}).to_list(5000)
    npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0, 'name': 1}).to_list(5000)
    quests = await db.quests.find({'campaign_id': campaign_id}, {'_id': 0, 'title': 1}).to_list(5000)
    return {
        'locations': [item.get('name') for item in locations],
        'npcs': [item.get('name') for item in npcs],
        'quests': [item.get('title') for item in quests],
    }


async def _setting_content(campaign_id: str) -> str:
    setting = await db.campaign_settings.find_one({'campaign_id': campaign_id}, {'_id': 0, 'content': 1})
    return str((setting or {}).get('content') or '')


# The World Setting tab keeps its text in these sections (CampaignSettingTab);
# imported world text goes into Import Parking, the GM's unsorted notes, so
# nothing from a document lands in the public overview unreviewed.
SETTING_SECTIONS = ['Public Overview', 'Current Situation', 'Tone & Themes', 'GM Truths & Secrets', 'Import Parking']


def _with_import_parking(content: str, blocks: List[str]) -> str:
    addition = '\n\n'.join(blocks)
    if '## Import Parking' in content:
        return f"{content.rstrip()}\n\n{addition}"
    structured = '## Public Overview' in content or '## Current Situation' in content
    if structured:
        return f"{content.rstrip()}\n\n## Import Parking\n{addition}"
    # Unstructured text is what the tab shows as the Public Overview; keep it there.
    parts = ['# World Overview', '']
    for title in SETTING_SECTIONS:
        body = content.strip() if title == 'Public Overview' else addition if title == 'Import Parking' else ''
        parts.extend([f'## {title}', body, ''])
    return '\n'.join(parts).rstrip()


def _faction_block(faction: Dict[str, Any]) -> str:
    lines = [f"Faction: {faction.get('name', '').strip()}"]
    for label, key in (('Goal', 'goal'), ('Leader', 'leader'), ('Base', 'base'), ('Allies', 'allies'), ('Enemies', 'enemies')):
        if str(faction.get(key) or '').strip():
            lines.append(f"{label}: {faction[key].strip()}")
    if str(faction.get('description') or '').strip():
        lines.append(faction['description'].strip())
    return '\n'.join(lines)


@router.get('/campaigns/{campaign_id}/world-document/template')
async def download_world_template(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0, 'name': 1}) or {}
    content = build_world_template(campaign.get('name') or '')
    return Response(
        content=content,
        media_type=DOCX_MEDIA_TYPE,
        headers={'Content-Disposition': 'attachment; filename="world-document.docx"'},
    )


@router.post('/campaigns/{campaign_id}/world-document/read')
async def read_world_document(campaign_id: str, file: UploadFile = File(...), username: str = Depends(get_current_user)):
    """Read a filled world document into drafts. Writes nothing."""
    await verify_campaign_ownership(campaign_id, username)
    content = await file.read(MAX_DOCUMENT_BYTES + 1)
    try:
        drafts = parse_world_document(content)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    drafts = mark_existing(drafts, await _existing_names(campaign_id))
    setting = normalise_name(await _setting_content(campaign_id))
    for faction in drafts['factions']:
        faction['exists'] = normalise_name(f"Faction: {faction.get('name', '')}") in setting
    drafts['overview_exists'] = bool(drafts['overview']) and normalise_name(drafts['overview']) in setting
    drafts['lore_exists'] = bool(drafts['lore']) and normalise_name(drafts['lore']) in setting
    return drafts


class WorldDocumentSave(BaseModel):
    overview: str = ''
    lore: str = ''
    locations: List[Dict[str, Any]] = Field(default_factory=list)
    npcs: List[Dict[str, Any]] = Field(default_factory=list)
    factions: List[Dict[str, Any]] = Field(default_factory=list)
    quests: List[Dict[str, Any]] = Field(default_factory=list)


def _text(value: Any, limit: int = 4000) -> str:
    return str(value or '').strip()[:limit]


@router.post('/campaigns/{campaign_id}/world-document/save')
async def save_world_document(campaign_id: str, payload: WorldDocumentSave, username: str = Depends(get_current_user)):
    """Save the drafts the GM chose. Skips anything already in the campaign."""
    await verify_campaign_ownership(campaign_id, username)
    existing = {key: {normalise_name(name) for name in names} for key, names in (await _existing_names(campaign_id)).items()}
    created = {'locations': 0, 'npcs': 0, 'quests': 0, 'world_text': 0}
    skipped = {'locations': 0, 'npcs': 0, 'quests': 0, 'world_text': 0}

    for item in payload.locations[:200]:
        name = _text(item.get('name'), 200)
        if not name or normalise_name(name) in existing['locations']:
            skipped['locations'] += 1
            continue
        location = Location(
            campaign_id=campaign_id,
            name=name,
            location_type=_text(item.get('location_type'), 100),
            description=_text(item.get('description')),
            notable_npcs=_text(item.get('notable_npcs'), 1000),
            notes=_text(item.get('notes')),
        )
        await db.locations.insert_one(location.model_dump())
        existing['locations'].add(normalise_name(name))
        created['locations'] += 1

    for item in payload.npcs[:200]:
        name = _text(item.get('name'), 200)
        if not name or normalise_name(name) in existing['npcs']:
            skipped['npcs'] += 1
            continue
        # Story people only: no combat statistics are invented for them.
        npc = NPC(
            campaign_id=campaign_id,
            name=name,
            role=_text(item.get('role'), 200),
            race=_text(item.get('race'), 100),
            alignment=_text(item.get('alignment'), 50),
            location=_text(item.get('location'), 200),
            personality=_text(item.get('personality')),
            appearance=_text(item.get('appearance')),
            description=_text(item.get('description')),
            backstory=_text(item.get('backstory')),
            combat_ready=False,
            stats=NPCStats(),
        )
        await db.npcs.insert_one(npc.model_dump())
        existing['npcs'].add(normalise_name(name))
        created['npcs'] += 1

    for item in payload.quests[:200]:
        title = _text(item.get('title'), 200)
        if not title or normalise_name(title) in existing['quests']:
            skipped['quests'] += 1
            continue
        objectives = [normalise_objective({'title': _text(text, 300)}) for text in (item.get('objectives') or [])[:30] if _text(text)]
        quest = {
            'id': f'quest-{uuid4().hex}',
            'campaign_id': campaign_id,
            'title': title,
            'summary': _text(item.get('summary')),
            'hook': _text(item.get('hook')),
            'gm_notes': _text(item.get('gm_notes')),
            'status': 'draft',
            'objectives': objectives,
            'linked_npc_ids': [], 'linked_location_ids': [], 'linked_encounter_ids': [],
            'linked_map_ids': [], 'linked_handout_ids': [], 'linked_reward_ids': [],
            'is_pinned': False,
            'shared_with_players': False,
            'created_by': username,
            'created_at': now_iso(),
            'updated_at': now_iso(),
        }
        await db.quests.insert_one(quest)
        existing['quests'].add(normalise_name(title))
        created['quests'] += 1

    # World text (overview, factions, lore) goes into the World Setting, which
    # Rook reads as campaign context. Each block is added once, after the GM's
    # own text, never replacing it.
    content = await _setting_content(campaign_id)
    blocks: List[str] = []
    if _text(payload.overview, 20000):
        blocks.append(f"World overview\n{_text(payload.overview, 20000)}")
    for faction in payload.factions[:100]:
        if _text(faction.get('name'), 200):
            blocks.append(_faction_block(faction))
    if _text(payload.lore, 20000):
        blocks.append(f"Lore & history\n{_text(payload.lore, 20000)}")
    added: List[str] = []
    for block in blocks:
        body = block.split('\n', 1)[1] if block.startswith(('World overview\n', 'Lore & history\n')) else block
        if normalise_name(body) in normalise_name(content):
            skipped['world_text'] += 1
            continue
        added.append(block)
    if added:
        new_content = _with_import_parking(content, added)
        await db.campaign_settings.update_one(
            {'campaign_id': campaign_id},
            {'$set': {'content': new_content}, '$setOnInsert': {'campaign_id': campaign_id, 'id': str(uuid4()), 'created_at': now_iso(), 'dm_rules': ''}},
            upsert=True,
        )
        created['world_text'] = len(added)

    return {'created': created, 'skipped': skipped}
