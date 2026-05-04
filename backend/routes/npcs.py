"""NPC routes: CRUD, AI generation, relationship web."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user, verify_campaign_ownership, check_premium_feature, increment_ai_usage
from utils.helpers import get_campaign_context
from models import (
    NPC, NPCCreate, NPCUpdate, NPCStats, NPCAttack, NPCAbility, NPCSpells,
    GenerateNPCRequest, NPCRelationship, NPCRelationshipCreate
)
from typing import Optional, List
import uuid
import json
from datetime import datetime, timezone
from utils.llm_provider import LlmChat, UserMessage, get_llm_api_key

router = APIRouter()

@router.post("/campaigns/{campaign_id}/npcs", status_code=status.HTTP_201_CREATED)
async def create_npc(campaign_id: str, npc_data: NPCCreate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    npc_dict = npc_data.model_dump()
    # Handle occupation field from old name generator
    occupation = npc_dict.pop('occupation', '')
    if occupation and not npc_dict.get('role'):
        npc_dict['role'] = occupation
    # Set max_hp to match hp if not set
    if npc_dict.get('hp') and not npc_dict.get('max_hp'):
        npc_dict['max_hp'] = npc_dict['hp']
    if npc_dict.get('stats') is None:
        npc_dict['stats'] = NPCStats().model_dump()
    npc_obj = NPC(campaign_id=campaign_id, **npc_dict)
    doc = npc_obj.model_dump()
    await db.npcs.insert_one(doc)
    doc.pop('_id', None)
    return doc

@router.get("/campaigns/{campaign_id}/npcs", response_model=List[NPC])
async def get_npcs(campaign_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(1000)
    return npcs

@router.put("/campaigns/{campaign_id}/npcs/{npc_id}")
async def update_npc(campaign_id: str, npc_id: str, npc_data: NPCUpdate, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    update_dict = {k: v for k, v in npc_data.model_dump().items() if v is not None}
    # Convert nested models to dicts
    if 'stats' in update_dict and hasattr(update_dict['stats'], 'model_dump'):
        update_dict['stats'] = update_dict['stats'].model_dump()
    if 'attacks' in update_dict:
        update_dict['attacks'] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in update_dict['attacks']]
    if 'abilities' in update_dict:
        update_dict['abilities'] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in update_dict['abilities']]
    if 'spells' in update_dict and update_dict['spells'] and hasattr(update_dict['spells'], 'model_dump'):
        update_dict['spells'] = update_dict['spells'].model_dump()
    result = await db.npcs.update_one(
        {'id': npc_id, 'campaign_id': campaign_id},
        {'$set': update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NPC not found")
    
    npc = await db.npcs.find_one({'id': npc_id}, {'_id': 0})
    return npc

@router.delete("/campaigns/{campaign_id}/npcs/{npc_id}")
async def delete_npc(campaign_id: str, npc_id: str, username: str = Depends(get_current_user)):
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.npcs.delete_one({'id': npc_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NPC not found")
    return {'message': 'NPC deleted successfully'}

@router.post("/campaigns/{campaign_id}/npcs/generate")
async def generate_npc_with_stats(campaign_id: str, request: GenerateNPCRequest, username: str = Depends(get_current_user)):
    """AI-generate a full NPC with stat block, class-appropriate abilities, attacks, and spells."""
    await verify_campaign_ownership(campaign_id, username)
    
    can_use_ai = await check_premium_feature(username, 'ai')
    if not can_use_ai:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="AI generation limit reached. Upgrade for unlimited access!")
    
    api_key = get_llm_api_key("openai")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
    
    campaign_context = await get_campaign_context(campaign_id)
    
    race_hint = f'Race: {request.race}. ' if request.race else ''
    class_hint = f'Class: {request.class_name}. ' if request.class_name else ''
    level_hint = f'Level: {request.level}. '
    role_hint = f'Role in campaign: {request.role}. ' if request.role else ''
    user_prompt = request.prompt if request.prompt else 'Generate a unique and interesting NPC.'
    
    system_message = """You are ROOK, a TTRPG NPC generator that creates fully statted NPCs using D&D 5e SRD rules.

RULES:
1. Respond ONLY with valid JSON - no markdown, no code fences, no explanation
2. Ability scores should be appropriate for the NPC's level and class
3. Calculate proficiency bonus from level: levels 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6
4. HP should be calculated roughly as: (hit die avg + CON mod) * level
5. AC should match their equipment/class (unarmored, leather, chain, plate, mage armor, etc.)
6. Skills should match their class and background
7. Attacks should include specific to-hit bonuses and damage dice
8. If the class is a spellcaster, include full spell list appropriate to their level with cantrips and leveled spells from the SRD
9. Abilities/features should be class-appropriate for their level (e.g., a level 5 Fighter gets Extra Attack)
10. Use ONLY content from the 5e SRD/OGL - no copyrighted material
11. saving_throws should list the ability names that the NPC is proficient in saving throws for"""

    npc_json_schema = """{
  "name": "Full Name",
  "race": "Race",
  "class_name": "Class (Fighter, Wizard, Cleric, Rogue, Ranger, Warlock, Bard, Barbarian, Druid, Monk, Paladin, Sorcerer)",
  "level": 5,
  "alignment": "e.g. Neutral Good",
  "appearance": "2 sentences describing physical appearance",
  "personality": "2 sentences describing personality traits, ideals, flaws",
  "backstory": "2-3 sentences of background",
  "role": "Role in campaign (Ally, Enemy, Merchant, Quest Giver, etc.)",
  "hp": 38,
  "max_hp": 38,
  "ac": 16,
  "speed": "30 ft.",
  "proficiency_bonus": 3,
  "stats": {
    "strength": 16,
    "dexterity": 12,
    "constitution": 14,
    "intelligence": 10,
    "wisdom": 13,
    "charisma": 8
  },
  "saving_throws": ["strength", "constitution"],
  "skills": ["athletics", "intimidation", "perception", "survival"],
  "attacks": [
    {"name": "Longsword", "bonus": "+6", "damage": "1d8+3 slashing", "notes": "Versatile (1d10+3)"},
    {"name": "Handaxe", "bonus": "+6", "damage": "1d6+3 slashing", "notes": "Thrown (20/60)"}
  ],
  "abilities": [
    {"name": "Second Wind", "description": "Regain 1d10+5 HP as a bonus action (1/short rest)"},
    {"name": "Action Surge", "description": "Take one additional action (1/short rest)"},
    {"name": "Extra Attack", "description": "Attack twice when taking the Attack action"}
  ],
  "spells": null,
  "location": "Where they can be found",
  "notes": "GM notes, secrets, plot hooks, motivations"
}

For spellcasters, spells should be:
{
  "casting_ability": "Charisma",
  "spell_save_dc": 15,
  "spell_attack_bonus": 7,
  "cantrips": ["Fire Bolt", "Mage Hand", "Prestidigitation"],
  "slot_level": 3,
  "slot_count": 2,
  "known_spells": ["Shield", "Misty Step", "Fireball", "Counterspell"]
}"""

    context_section = ""
    if campaign_context:
        context_section = f"\n\nCAMPAIGN CONTEXT:\n{campaign_context}\n\nMake the NPC fit naturally into this world."
    
    full_prompt = f"""Generate a fully statted NPC with the following requirements:
{race_hint}{class_hint}{level_hint}{role_hint}
User request: {user_prompt}{context_section}

Respond with ONLY valid JSON matching this schema:
{npc_json_schema}"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"{username}-npc-gen-{datetime.now(timezone.utc).timestamp()}",
        system_message=system_message
    )
    chat.with_model('openai', 'gpt-4o')
    
    response = await chat.send_message(UserMessage(text=full_prompt))
    
    json_match = re.search(r'\{[\s\S]*\}', response)
    if not json_match:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to parse AI response")
    
    entity_data = json.loads(json_match.group())
    
    # Build NPC from AI response
    npc_id = str(uuid.uuid4())
    stats_data = entity_data.get('stats', {})
    spells_data = entity_data.get('spells')
    
    npc_doc = {
        'id': npc_id,
        'campaign_id': campaign_id,
        'name': entity_data.get('name', 'Unknown NPC'),
        'race': entity_data.get('race', request.race or 'Human'),
        'class_name': entity_data.get('class_name', request.class_name or 'Commoner'),
        'level': entity_data.get('level', request.level),
        'alignment': entity_data.get('alignment', 'True Neutral'),
        'description': entity_data.get('description', ''),
        'appearance': entity_data.get('appearance', ''),
        'personality': entity_data.get('personality', ''),
        'backstory': entity_data.get('backstory', ''),
        'role': entity_data.get('role', request.role or ''),
        'hp': entity_data.get('hp', 10),
        'max_hp': entity_data.get('max_hp', entity_data.get('hp', 10)),
        'ac': entity_data.get('ac', 10),
        'speed': entity_data.get('speed', '30 ft.'),
        'proficiency_bonus': entity_data.get('proficiency_bonus', 2),
        'stats': {
            'strength': stats_data.get('strength', 10),
            'dexterity': stats_data.get('dexterity', 10),
            'constitution': stats_data.get('constitution', 10),
            'intelligence': stats_data.get('intelligence', 10),
            'wisdom': stats_data.get('wisdom', 10),
            'charisma': stats_data.get('charisma', 10),
        },
        'saving_throws': entity_data.get('saving_throws', []),
        'skills': entity_data.get('skills', []),
        'attacks': entity_data.get('attacks', []),
        'abilities': entity_data.get('abilities', []),
        'spells': spells_data,
        'location': entity_data.get('location', ''),
        'notes': entity_data.get('notes', ''),
        'color': '#D4A017',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.npcs.insert_one(npc_doc)
    npc_doc.pop('_id', None)
    return npc_doc


@router.post("/campaigns/{campaign_id}/npc-relationships", status_code=status.HTTP_201_CREATED)
async def create_npc_relationship(campaign_id: str, rel_data: NPCRelationshipCreate, username: str = Depends(get_current_user)):
    """Create a relationship between two NPCs"""
    await verify_campaign_ownership(campaign_id, username)
    
    # Validate that both NPCs exist
    source = await db.npcs.find_one({'id': rel_data.source_id, 'campaign_id': campaign_id})
    target = await db.npcs.find_one({'id': rel_data.target_id, 'campaign_id': campaign_id})
    
    if not source or not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both NPCs not found")
    
    # Check if relationship already exists
    existing = await db.npc_relationships.find_one({
        'campaign_id': campaign_id,
        '$or': [
            {'source_id': rel_data.source_id, 'target_id': rel_data.target_id},
            {'source_id': rel_data.target_id, 'target_id': rel_data.source_id}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Relationship already exists between these NPCs")
    
    relationship = NPCRelationship(campaign_id=campaign_id, **rel_data.model_dump())
    doc = relationship.model_dump()
    await db.npc_relationships.insert_one(doc)
    # Remove _id before returning
    doc.pop('_id', None)
    return doc

@router.get("/campaigns/{campaign_id}/npc-relationships")
async def get_npc_relationships(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all NPC relationships for a campaign"""
    await verify_campaign_ownership(campaign_id, username)
    
    relationships = await db.npc_relationships.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).to_list(500)
    return relationships

@router.delete("/campaigns/{campaign_id}/npc-relationships/{relationship_id}")
async def delete_npc_relationship(campaign_id: str, relationship_id: str, username: str = Depends(get_current_user)):
    """Delete an NPC relationship"""
    await verify_campaign_ownership(campaign_id, username)
    
    result = await db.npc_relationships.delete_one({'id': relationship_id, 'campaign_id': campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found")
    return {'message': 'NPC relationship deleted successfully'}


# ==================== RULE SYSTEM & CONTENT MANAGEMENT ====================
