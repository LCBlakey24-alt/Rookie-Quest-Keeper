"""AI routes: ROOK generation, chat, portraits, tokens, session recap, smart notes."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger, ROOT_DIR
from utils.auth import (
    get_current_user, verify_campaign_ownership, verify_campaign_membership,
    check_premium_feature, increment_ai_usage, is_admin,
    get_campaign_rule_system
)
from utils.helpers import get_campaign_context
from models import (
    UnseenServantRequest, UnseenServantResponse, AIGenerationRequest, AIGenerationResponse,
    RookChatRequest, SmartNoteParseRequest, SmartNoteParseResponse, EntityMention, TimeChange,
    PortraitGenerateRequest, TokenGenerateRequest, SessionRecapRequest,
    God, GodCreate, NPC, NPCCreate, NPCStats, Location, LocationCreate,
    PlaceOfInterest, PlaceOfInterestCreate, CustomCreature, CustomCreatureCreate
)
from typing import Optional, Dict, Any, List
import uuid
import json
import os
import re
import base64
import asyncio
from datetime import datetime, timezone, timedelta
from utils.llm_provider import LlmChat, UserMessage, OpenAIImageGeneration, get_llm_api_key

router = APIRouter()

# ────────────────────────────────────────────────────────────────────────────
# Edition-aware prompt helpers
# ────────────────────────────────────────────────────────────────────────────
EDITION_INSTRUCTIONS_2024 = (
    "Use **D&D 5e 2024 (One D&D / 2024 PHB)** rules. Honor these key 2024 mechanics:\n"
    "- Origin Feats granted by Background at character creation (Tough, Magic Initiate, Skilled, etc.)\n"
    "- Subclasses chosen at level 3 for ALL classes (Cleric, Warlock, Wizard, Sorcerer included)\n"
    "- Weapon Mastery properties for martial classes (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)\n"
    "- Backgrounds grant +2/+1 Ability Score Improvements (NOT race/species)\n"
    "- Species replaces 'Race'; Half-Elf/Half-Orc removed; new species variants (Drow Elf, Wood Elf, etc.)\n"
    "- Rogue: Cunning Strike feature; Bard: expanded Inspiration uses; Wizard: Memorize Spell mid-combat\n"
    "- Heroic Inspiration mechanics standardized\n"
    "Stay strictly within SRD/OGL content."
)

EDITION_INSTRUCTIONS_2014 = (
    "Use **D&D 5e 2014 (Original Player's Handbook)** rules. Honor these key 2014 mechanics:\n"
    "- Race grants ASIs (e.g., Human Variant +1/+1, Half-Elf +2 CHA + floating)\n"
    "- Half-Elf, Half-Orc, Dragonborn original-style available\n"
    "- Subclass timing varies: Cleric L1, Wizard L2, Sorcerer L1, Warlock L1, others L3\n"
    "- No Weapon Mastery; standard 2014 attack rules\n"
    "- Backgrounds give skill/tool/language proficiencies and feature, NO ASI\n"
    "- Original Inspiration (advantage on a single roll, GM-granted)\n"
    "Stay strictly within SRD/OGL content."
)

def _campaign_edition(campaign: Optional[Dict[str, Any]]) -> str:
    """Return '2014' or '2024' from a campaign dict (defaults to 2024)."""
    if not campaign:
        return "2024"
    raw = str(campaign.get('rules_edition') or '').strip()
    if raw in ('2014', '2024'):
        return raw
    # Fallback: infer from `system` string (e.g. '5e 2024 Compatible')
    system_str = str(campaign.get('system') or '').lower()
    if '2024' in system_str:
        return '2024'
    if '2014' in system_str:
        return '2014'
    return '2024'

def edition_prompt_fragment(campaign: Optional[Dict[str, Any]]) -> str:
    """Returns an edition-specific instruction block for AI prompts."""
    ed = _campaign_edition(campaign)
    return EDITION_INSTRUCTIONS_2024 if ed == '2024' else EDITION_INSTRUCTIONS_2014

AI_SOURCE_BOUNDARY = """
CAMPAIGN SOURCE BOUNDARY:
- Use only the GM's saved campaign data, uploaded/custom rules, the current user prompt, and SRD/OGL mechanics as source material.
- Do not introduce named worlds, factions, characters, places, deities, plotlines, or lore from published settings, actual-play shows, novels, games, films, or third-party IP unless those exact details appear in the provided campaign context or user prompt.
- Treat selected genre/tone labels as mood only, not lore. Create original alternatives without naming or copying protected settings or characters.
- If campaign context is thin, keep suggestions generic/original or ask for the missing detail instead of filling gaps with known setting lore.
- For player-facing output, do not reveal GM-only secrets unless the provided source text explicitly marks them as player-known.
""".strip()

def ai_source_boundary_fragment() -> str:
    return AI_SOURCE_BOUNDARY

@router.post("/ai/generate-with-rules")
async def ai_generate_with_rules(request: Dict[str, Any], username: str = Depends(get_current_user)):
    """AI generation that respects the campaign's rule system"""
    campaign_id = request.get('campaign_id')
    prompt_type = request.get('type')
    context = request.get('context', '')
    
    if not campaign_id:
        raise HTTPException(status_code=400, detail="campaign_id is required")
    
    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    rule_system = await get_campaign_rule_system(campaign_id)
    system_name = campaign.get('system', 'Fantasy d20')
    
    # Build context from uploaded content in the rule system
    system_context = ""
    if rule_system:
        system_id = rule_system.get('id')
        classes = await db.game_classes.find({'system_id': system_id}, {'_id': 0, 'name': 1}).to_list(10)
        races = await db.game_races.find({'system_id': system_id}, {'_id': 0, 'name': 1}).to_list(10)
        if classes or races:
            system_context = "\n\nContent available in this campaign's rule system:\n"
            if classes:
                system_context += f"Classes: {', '.join(c['name'] for c in classes)}\n"
            if races:
                system_context += f"Races/Species: {', '.join(r['name'] for r in races)}\n"
    
    # Generic rule instructions based on campaign system setting
    rule_instructions = f"You are a TTRPG assistant for a campaign using the {system_name} rules.\n\n"
    rule_instructions += ai_source_boundary_fragment() + "\n\n"
    rule_instructions += edition_prompt_fragment(campaign) + "\n\n"
    rule_instructions += "Generate content that fits this campaign's setting and rule system. "
    rule_instructions += "Use appropriate terminology and mechanics for the system being used.\n"
    rule_instructions += system_context
    
    prompts = {
        'npc': f"{rule_instructions}\n\nGenerate an NPC. Context: {context}\n\nProvide: name, race/species, class, background, personality, and a secret.",
        'encounter': f"{rule_instructions}\n\nGenerate a combat encounter. Context: {context}\n\nProvide: enemies, quantity, tactics, and loot.",
        'item': f"{rule_instructions}\n\nGenerate a magic item. Context: {context}\n\nProvide: name, rarity, effects using {system_name} rules.",
        'location': f"{rule_instructions}\n\nGenerate a location. Context: {context}\n\nProvide: name, description, features, and secrets.",
        'plot_hook': f"{rule_instructions}\n\nGenerate a plot hook. Context: {context}\n\nProvide: hook, complications, NPCs, and rewards.",
    }
    
    prompt = prompts.get(prompt_type, f"{rule_instructions}\n\n{context}")
    
    try:
        llm_key = get_llm_api_key("openai")
        if not llm_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"ai-gen-{username}-{uuid.uuid4().hex[:8]}",
            system_message=f"You are a creative TTRPG game master assistant. Generate content that is engaging, balanced, and fits the specified rule system.\n\n{ai_source_boundary_fragment()}"
        ).with_model("openai", "gpt-5.2")
        
        user_msg = UserMessage(text=prompt)
        response = await chat.send_message(user_msg)
        response_text = response.strip() if isinstance(response, str) else str(response)
        
        return {"result": response_text, "rule_system": system_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# ROOK AI endpoint (renamed from Unseen Servant)
@router.post("/rook/generate", response_model=UnseenServantResponse)
@router.post("/unseen-servant/generate", response_model=UnseenServantResponse)  # Backwards compatibility
async def rook_generate(request: UnseenServantRequest, username: str = Depends(get_current_user)):
    """ROOK AI: Generates and auto-saves fantasy TTRPG content"""
    try:
        # Check if user can use AI features
        can_use_ai = await check_premium_feature(username, 'ai')
        if not can_use_ai:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You've reached your monthly AI generation limit. Upgrade to Adventurer for unlimited access!"
            )
        
        # Verify campaign ownership
        campaign = await db.campaigns.find_one({'id': request.campaign_id, 'dm_user_id': username})
        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
        api_key = get_llm_api_key("openai")
        if not api_key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
        
        # Define JSON schema prompts for each entity type
        entity_prompts = {
            'god': '''Generate a fantasy deity. Respond ONLY with valid JSON in this exact format:
{
  "name": "deity name",
  "domain": "primary domain (e.g., War, Knowledge, Nature)",
  "description": "2-3 sentences describing the deity",
  "symbol": "the deity's holy symbol",
  "alignment": "alignment (e.g., Lawful Good, Chaotic Neutral)",
  "notes": "additional lore or worship practices"
}''',
            'npc': '''Generate a fantasy NPC with full stat block. Respond ONLY with valid JSON in this exact format:
{
  "name": "NPC full name",
  "race": "Race",
  "class_name": "Class",
  "level": 5,
  "alignment": "Alignment",
  "description": "physical appearance, personality, and background in 2-3 sentences",
  "appearance": "physical appearance",
  "personality": "personality traits",
  "backstory": "brief backstory",
  "role": "Role in world",
  "hp": 32,
  "max_hp": 32,
  "ac": 14,
  "speed": "30 ft.",
  "proficiency_bonus": 3,
  "stats": {"strength": 10, "dexterity": 14, "constitution": 12, "intelligence": 13, "wisdom": 10, "charisma": 16},
  "saving_throws": ["wisdom", "charisma"],
  "skills": ["arcana", "deception"],
  "attacks": [{"name": "Dagger", "bonus": "+5", "damage": "1d4+2 piercing", "notes": "Finesse"}],
  "abilities": [{"name": "Feature", "description": "Description"}],
  "spells": null,
  "location": "where they can be found",
  "notes": "motivations, secrets, or plot hooks"
}''',
            'location': '''Generate a fantasy location. Respond ONLY with valid JSON in this exact format:
{
  "name": "location name",
  "location_type": "type (City, Town, Village, Dungeon, Forest, etc.)",
  "description": "2-3 sentences describing the location",
  "notable_npcs": "key NPCs found here",
  "notes": "secrets, hooks, or GM notes"
}''',
            'place_of_interest': '''Generate a place of interest (shop, tavern, temple, etc.). Respond ONLY with valid JSON in this exact format:
{
  "name": "establishment name",
  "place_type": "type (shop, tavern, temple, blacksmith, guild, library, residence, other)",
  "description": "2-3 sentences describing the place",
  "owner": "name of proprietor/owner",
  "services": "what services or items are offered",
  "notes": "secrets, rumors, or plot hooks"
}''',
            'creature': '''Generate a custom creature/monster for a fantasy TTRPG. Respond ONLY with valid JSON in this exact format:
{
  "name": "creature name",
  "cr": "challenge rating (0, 1/8, 1/4, 1/2, or 1-30)",
  "hp": 45,
  "ac": 14,
  "type": "creature type (aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, undead)",
  "size": "size (Tiny, Small, Medium, Large, Huge, Gargantuan)",
  "speed": "movement speeds (e.g., 30 ft., fly 60 ft.)",
  "abilities": "key abilities, attacks, and special features (e.g., Multiattack, Bite 2d6+4, Fire Breath 8d6)",
  "description": "2-3 sentences describing appearance, behavior, and lore"
}'''
        }
        
        # Add aliases for entity types
        entity_prompts['world_place'] = entity_prompts['place_of_interest']
        
        if request.entity_type not in entity_prompts:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid entity type: {request.entity_type}")
        
        # Gather campaign context for smarter AI generation
        campaign_context = await get_campaign_context(request.campaign_id)
        
        # Build the full prompt with campaign context
        system_message = f"""You are ROOK, a magical AI assistant for tabletop RPG Game Masters. You generate content that fits seamlessly into the GM's existing world and campaign.

IMPORTANT RULES:
1. Generate content in strict JSON format only - no markdown, no explanations
2. Make your creations fit naturally with the existing world context provided
3. Reference existing NPCs, locations, or deities when appropriate
4. Maintain consistency with the established setting and tone

{ai_source_boundary_fragment()}"""

        # Build prompt with context
        context_section = ""
        if campaign_context:
            context_section = f"\n\n=== CAMPAIGN CONTEXT ===\n{campaign_context}\n=== END CONTEXT ===\n\nUse only this saved context and the user's request to make your generation fit naturally into this world.\n\n"
        
        full_prompt = f"{entity_prompts[request.entity_type]}{context_section}\nUser request: {request.prompt}"
        
        # Initialize LLM
        chat = LlmChat(
            api_key=api_key,
            session_id=f"{username}-unseen-servant-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_message
        )
        chat.with_model('openai', 'gpt-4o')
        
        # Get AI response
        response = await chat.send_message(UserMessage(text=full_prompt))
        
        # Parse JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if not json_match:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to parse AI response as JSON")
        
        entity_data = json.loads(json_match.group())
        
        # Save entity based on type
        entity_id = str(uuid.uuid4())
        entity_name = entity_data.get('name', 'Unnamed')
        
        if request.entity_type == 'god':
            new_god = God(
                id=entity_id,
                campaign_id=request.campaign_id,
                name=entity_data.get('name', 'Unknown Deity'),
                domain=entity_data.get('domain', ''),
                description=entity_data.get('description', ''),
                symbol=entity_data.get('symbol', ''),
                alignment=entity_data.get('alignment', ''),
                notes=entity_data.get('notes', '')
            )
            await db.gods.insert_one(new_god.model_dump())
            
        elif request.entity_type == 'npc':
            stats_data = entity_data.get('stats', {})
            spells_data = entity_data.get('spells')
            npc_doc = {
                'id': entity_id,
                'campaign_id': request.campaign_id,
                'name': entity_data.get('name', 'Unknown NPC'),
                'race': entity_data.get('race', 'Human'),
                'class_name': entity_data.get('class_name', 'Commoner'),
                'level': entity_data.get('level', 1),
                'alignment': entity_data.get('alignment', ''),
                'description': entity_data.get('description', ''),
                'appearance': entity_data.get('appearance', ''),
                'personality': entity_data.get('personality', ''),
                'backstory': entity_data.get('backstory', ''),
                'role': entity_data.get('role', ''),
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
            
        elif request.entity_type == 'location':
            new_location = Location(
                id=entity_id,
                campaign_id=request.campaign_id,
                name=entity_data.get('name', 'Unknown Location'),
                location_type=entity_data.get('location_type', ''),
                description=entity_data.get('description', ''),
                notable_npcs=entity_data.get('notable_npcs', ''),
                notes=entity_data.get('notes', ''),
                places_of_interest=[]
            )
            await db.locations.insert_one(new_location.model_dump())
            
        elif request.entity_type == 'place_of_interest' or request.entity_type == 'world_place':
            if not request.location_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="location_id required for place_of_interest")
            
            location = await db.locations.find_one({'id': request.location_id, 'campaign_id': request.campaign_id})
            if not location:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
            
            new_place = {
                'id': entity_id,
                'name': entity_data.get('name', 'Unknown Place'),
                'place_type': entity_data.get('place_type', 'other'),
                'description': entity_data.get('description', ''),
                'owner': entity_data.get('owner', ''),
                'services': entity_data.get('services', ''),
                'notes': entity_data.get('notes', '')
            }
            
            places = location.get('places_of_interest', [])
            places.append(new_place)
            
            await db.locations.update_one(
                {'id': request.location_id},
                {'$set': {'places_of_interest': places}}
            )
        
        elif request.entity_type == 'creature':
            new_creature = CustomCreature(
                id=entity_id,
                campaign_id=request.campaign_id,
                name=entity_data.get('name', 'Unknown Creature'),
                cr=str(entity_data.get('cr', '1')),
                hp=int(entity_data.get('hp', 10)),
                ac=int(entity_data.get('ac', 10)),
                type=entity_data.get('type', 'humanoid'),
                size=entity_data.get('size', 'Medium'),
                speed=entity_data.get('speed', '30 ft.'),
                abilities=entity_data.get('abilities', ''),
                description=entity_data.get('description', ''),
                created_by=username
            )
            await db.custom_creatures.insert_one(new_creature.model_dump())
        
        # Increment AI usage for free tier users
        await increment_ai_usage(username)
        
        return UnseenServantResponse(
            success=True,
            entity_type=request.entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            message=f"Successfully created {request.entity_type}: {entity_name}"
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to parse AI response")
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Unseen Servant error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Generation failed: {str(e)}")

@router.post("/ai/generate", response_model=AIGenerationResponse)
async def generate_ai_content(request: AIGenerationRequest, username: str = Depends(get_current_user)):
    try:
        # Check if user can use AI features
        can_use_ai = await check_premium_feature(username, 'ai')
        if not can_use_ai:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You've reached your monthly AI generation limit. Upgrade to Adventurer for unlimited access!"
            )
        
        # Get API key from environment
        api_key = get_llm_api_key("openai")
        if not api_key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
        
        # Get campaign context if campaign_id provided
        system_context = ""
        world_context = ""
        edition_context = ""
        if hasattr(request, 'campaign_id') and request.campaign_id:
            await verify_campaign_membership(request.campaign_id, username)
            campaign = await db.campaigns.find_one({'id': request.campaign_id})
            if campaign:
                system_context = f" for {campaign.get('system', '5e Compatible')} system"
                edition_context = f"\n\nRULES EDITION:\n{edition_prompt_fragment(campaign)}"
                saved_campaign_context = await get_campaign_context(request.campaign_id)
                
                # Build world setting context. Genre presets are tone labels only;
                # all concrete lore must come from GM-saved campaign fields.
                world_setting = campaign.get('world_setting', 'custom')
                world_notes = campaign.get('world_setting_notes', '')
                
                world_context = f"\n\n{ai_source_boundary_fragment()}"
                world_context += f"\n\nSELECTED GENRE/TONE LABEL: {world_setting}. This is not lore; do not import external setting details from it."
                if saved_campaign_context:
                    world_context += f"\n\nSAVED CAMPAIGN CONTEXT:\n{saved_campaign_context}"
                if world_notes:
                    world_context += f"\n\nGM WORLD NOTES:\n{world_notes}"
                # Always append edition rules at the end so AI honors 2014 vs 2024 mechanics
                if edition_context:
                    world_context += edition_context
                
                # Add custom rules if available (limit context size)
                custom_rules = []
                async for rule in db.campaign_custom_rules.find({'campaign_id': request.campaign_id}, {'_id': 0, 'content': 1, 'name': 1}).limit(3):
                    custom_rules.append(rule)
                
                if custom_rules:
                    # Limit total rules context to ~50K chars to avoid overwhelming the AI
                    rules_context = "\n\nCUSTOM RULES REFERENCE (use these rules when applicable):\n"
                    total_chars = 0
                    for rule in custom_rules:
                        rule_content = rule.get('content', '')
                        if total_chars + len(rule_content) < 50000:
                            rules_context += f"\n--- {rule.get('name', 'Custom Rules')} ---\n{rule_content}\n"
                            total_chars += len(rule_content)
                        else:
                            # Truncate if too long
                            remaining = 50000 - total_chars
                            if remaining > 1000:
                                rules_context += f"\n--- {rule.get('name', 'Custom Rules')} (truncated) ---\n{rule_content[:remaining]}...\n"
                            break
                    world_context += rules_context
        
        # Create system message based on generation type
        system_messages = {
            'encounter': f'You are a TTRPG encounter designer{system_context}. Create detailed, balanced encounters with monsters, tactics, and environmental details following the rules and conventions of the system.{world_context}',
            'trap': f'You are a TTRPG trap designer{system_context}. Create creative and dangerous traps with trigger mechanisms, effects, and disarm methods appropriate for the system.{world_context}',
            'npc': f'You are a TTRPG NPC creator{system_context}. Create memorable NPCs with personality, backstory, stats, and plot hooks using the system\'s stat format. Make NPCs fit naturally into the campaign world.{world_context}',
            'world': f'You are a TTRPG world-builder{system_context}. Create rich locations, lore, factions, and story hooks that fit seamlessly into the established setting.{world_context}',
            'plot': f'You are a TTRPG story architect{system_context}. Create compelling plot hooks, story arcs, and adventure ideas that tie into the world\'s established lore and factions.{world_context}',
            'location': f'You are a TTRPG location designer{system_context}. Create detailed locations with atmosphere, inhabitants, secrets, and adventure hooks appropriate for the setting.{world_context}'
        }
        
        system_message = system_messages.get(request.generation_type, f'You are a helpful TTRPG assistant{system_context}.{world_context}')
        if "CAMPAIGN SOURCE BOUNDARY" not in system_message:
            system_message += f"\n\n{ai_source_boundary_fragment()}"
        
        # Initialize LLM chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"{username}-{request.generation_type}-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_message
        )
        chat.with_model('openai', 'gpt-4o')
        
        # Create user message
        user_message = UserMessage(text=request.prompt)
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        # Increment AI usage for free tier users
        await increment_ai_usage(username)
        
        return AIGenerationResponse(
            content=response,
            generation_type=request.generation_type
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI generation failed: {str(e)}")

@router.post("/rook/chat")
async def rook_chat(request: RookChatRequest, username: str = Depends(get_current_user)):
    """ROOK AI Co-GM: Context-aware chat assistant for the GM Screen."""
    can_use_ai = await check_premium_feature(username, 'ai')
    if not can_use_ai:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="AI generation limit reached. Upgrade for unlimited access!")
    
    api_key = get_llm_api_key("openai")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
    
    campaign_context = ""
    edition_block = ""
    if request.campaign_id:
        await verify_campaign_membership(request.campaign_id, username)
        campaign_context = await get_campaign_context(request.campaign_id)
        campaign = await db.campaigns.find_one({'id': request.campaign_id}, {'_id': 0})
        if campaign:
            edition_block = f"\n\nRULES EDITION:\n{edition_prompt_fragment(campaign)}"
    
    system_msg = request.context or "You are ROOK, an AI co-GM assistant for D&D 5e. Help the Game Master with encounters, NPCs, world building, and story development. Use only SRD/OGL content. Be creative, concise, and dramatic."
    system_msg = f"{ai_source_boundary_fragment()}\n\n{system_msg}"
    if campaign_context:
        system_msg += f"\n\nCAMPAIGN CONTEXT:\n{campaign_context}"
    if edition_block:
        system_msg += edition_block
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"{username}-cogm-{datetime.now(timezone.utc).timestamp()}",
        system_message=system_msg
    )
    chat.with_model('openai', 'gpt-4o')
    
    response = await chat.send_message(UserMessage(text=request.message))
    await increment_ai_usage(username)
    
    return {"response": response}

@router.post("/campaigns/{campaign_id}/ingame-notes/{note_id}/process-ai")
async def process_note_with_ai(campaign_id: str, note_id: str, username: str = Depends(get_current_user)):
    try:
        campaign = await db.campaigns.find_one({'id': campaign_id, 'dm_user_id': username})
        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
        note = await db.ingame_notes.find_one({'id': note_id, 'campaign_id': campaign_id})
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
        
        api_key = get_llm_api_key("openai")
        if not api_key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI key not configured")
        
        # Get campaign context
        players = await db.players.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
        npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
        locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
        gods = await db.gods.find({'campaign_id': campaign_id}, {'_id': 0}).to_list(100)
        
        player_names = [p['name'] for p in players]
        npc_names = [n['name'] for n in npcs]
        location_names = [l['name'] for l in locations]
        god_names = [g['name'] for g in gods]
        
        system_message = f"""You are an AI assistant helping organize tabletop RPG campaign notes.
Given campaign notes from a session, extract structured information and suggest additions to existing entities or new entities to create.

{ai_source_boundary_fragment()}

Campaign Context:
- Players: {', '.join(player_names) if player_names else 'None yet'}
- NPCs: {', '.join(npc_names) if npc_names else 'None yet'}
- Locations: {', '.join(location_names) if location_names else 'None yet'}
- Gods: {', '.join(god_names) if god_names else 'None yet'}

Analyze the session notes and return a JSON response with this structure:
{{
  "new_npcs": [{{ "name": "NPC Name", "description": "Brief description", "notes": "Session context" }}],
  "new_locations": [{{ "name": "Location Name", "type": "city/dungeon/etc", "description": "Brief description", "notes": "Session context" }}],
  "new_gods": [{{ "name": "God Name", "domain": "Domain", "description": "Brief description" }}],
  "npc_updates": [{{ "name": "Existing NPC Name", "additional_notes": "New information learned" }}],
  "location_updates": [{{ "name": "Existing Location Name", "additional_notes": "New information learned" }}]
}}

Only include entities that are explicitly mentioned in the notes. Return ONLY valid JSON, no other text."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"process-note-{note_id}",
            system_message=system_message
        )
        chat.with_model('openai', 'gpt-4o')
        
        user_message = UserMessage(text=f"Session Notes:\n\n{note['content']}")
        response = await chat.send_message(user_message)
        
        # Parse the AI response
        import json
        try:
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                suggestions = json.loads(response[json_start:json_end])
            else:
                suggestions = {}
        except:
            suggestions = {}
        
        # Mark note as processed
        await db.ingame_notes.update_one(
            {'id': note_id},
            {'$set': {'ai_processed': True}}
        )
        
        return {
            'suggestions': suggestions,
            'message': 'AI processing complete'
        }
    except Exception as e:
        logger.error(f"AI processing error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI processing failed: {str(e)}")

# ==================== PARTY INVENTORY ROUTES ====================

async def parse_session_notes(
    campaign_id: str, 
    request: SmartNoteParseRequest,
    username: str = Depends(get_current_user)
):
    """
    Smart Note Parsing: Extract entities, events, and time changes from session notes.
    Uses AI to automatically suggest updates to NPCs, locations, calendar, etc.
    """
    await verify_campaign_ownership(campaign_id, username)
    
    note_text = request.note_text
    
    if not note_text or len(note_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note text too short. Please provide at least 10 characters."
        )
    
    # Fetch existing campaign entities to help AI match them
    npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0, 'id': 1, 'name': 1}).to_list(200)  # Limit for AI context
    locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0, 'id': 1, 'name': 1}).to_list(200)
    
    npc_names = [npc['name'] for npc in npcs]
    location_names = [loc['name'] for loc in locations]
    
    # Build AI prompt
    system_message = f"""You are a tabletop RPG Game Master assistant that extracts structured information from session notes.

{ai_source_boundary_fragment()}

Your task: Analyze the session notes and extract:
1. NPCs mentioned (with what happened to them)
2. Locations visited or mentioned
3. Time that has passed (long rests, short rests, days, hours)
4. Important events

IMPORTANT: Match entity names to existing entities when possible (case-insensitive).

Respond in valid JSON format only. No markdown, no explanations."""

    user_prompt = f"""Session Notes:
{note_text}

Known NPCs in this campaign: {', '.join(npc_names) if npc_names else 'None yet'}
Known Locations in this campaign: {', '.join(location_names) if location_names else 'None yet'}

Extract and return JSON in this EXACT format:
{{
  "entities": [
    {{
      "type": "npc" or "location",
      "name": "Exact name from notes",
      "existing_name": "Matching name from known entities (or null if new)",
      "notes": "What happened involving this entity",
      "location": "Where this entity is (optional)"
    }}
  ],
  "time_changes": [
    {{
      "type": "long_rest" or "short_rest" or "hours" or "days",
      "amount": 8 (for hours) or 1 (for days),
      "description": "Human readable description"
    }}
  ]
}}"""

    try:
        llm_key = get_llm_api_key("openai")
        if not llm_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service not configured"
            )
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"smart-notes-{campaign_id}-{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("openai", "gpt-5.2")
        response_text = await chat.send_message(
            UserMessage(text=user_prompt),
            max_tokens=1500,
            temperature=0.3
        )
        response_text = response_text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        parsed_data = json.loads(response_text)
        
        # Map to response model
        entities_mentioned = []
        for entity in parsed_data.get('entities', []):
            entity_type = entity.get('type', '').lower()
            name = entity.get('name', '')
            existing_name = entity.get('existing_name')
            notes = entity.get('notes', '')
            location = entity.get('location')
            
            # Find existing entity ID
            existing_id = None
            if existing_name:
                if entity_type == 'npc':
                    for npc in npcs:
                        if npc['name'].lower() == existing_name.lower():
                            existing_id = npc['id']
                            name = npc['name']  # Use exact existing name
                            break
                elif entity_type == 'location':
                    for loc in locations:
                        if loc['name'].lower() == existing_name.lower():
                            existing_id = loc['id']
                            name = loc['name']
                            break
            
            entities_mentioned.append(EntityMention(
                entity_type=entity_type,
                name=name,
                existing_id=existing_id,
                suggested_notes=notes,
                suggested_location=location,
                confidence="high" if existing_id else "medium"
            ))
        
        # Process time changes
        time_changes_list = []
        total_hours = 0
        
        for time_change in parsed_data.get('time_changes', []):
            tc_type = time_change.get('type', '').lower()
            amount = time_change.get('amount', 0)
            description = time_change.get('description', '')
            
            # Calculate hours
            if tc_type == 'long_rest':
                total_hours += 8
                amount = 8
            elif tc_type == 'short_rest':
                total_hours += 1
                amount = 1
            elif tc_type == 'hours':
                total_hours += amount
            elif tc_type == 'days':
                total_hours += (amount * 24)
            
            time_changes_list.append(TimeChange(
                type=tc_type,
                amount=amount,
                description=description
            ))
        
        # Calculate new calendar date if time passed
        new_calendar_date = None
        calendar_update_suggested = total_hours > 0
        
        if calendar_update_suggested:
            # Fetch current calendar
            calendar = await db.calendar.find_one({'campaign_id': campaign_id}, {'_id': 0})
            if calendar:
                current_date_str = calendar.get('current_date', '')
                if current_date_str:
                    try:
                        from datetime import datetime as dt
                        current_date = dt.fromisoformat(current_date_str.replace('Z', '+00:00'))
                        new_date = current_date + timedelta(hours=total_hours)
                        new_calendar_date = new_date.isoformat()
                    except:
                        pass
        
        return SmartNoteParseResponse(
            success=True,
            entities_mentioned=entities_mentioned,
            time_changes=time_changes_list,
            calendar_update_suggested=calendar_update_suggested,
            new_calendar_date=new_calendar_date
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI returned invalid format. Please try again."
        )
    except Exception as e:
        logger.error(f"Smart note parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse notes: {str(e)}"
        )

# ==================== USER RULESET ROUTES ====================

async def ai_generate_portrait(
    request: PortraitGenerateRequest,
    username: str = Depends(get_current_user)
):
    """
    AI Portrait Generator: Create a character portrait image.
    Returns base64 encoded image data.
    """
    # Check AI usage limits
    can_use_ai = await check_premium_feature(username, 'ai')
    if not can_use_ai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail={
                "error": "ai_limit_reached",
                "message": "You've reached your monthly AI generation limit. Upgrade for more AI calls!",
                "upgrade_tier": "player"
            }
        )
    
    # Build portrait prompt
    appearance_desc = request.appearance if request.appearance else "fantasy adventurer"
    
    portrait_prompt = f"""Fantasy character portrait, RPG style digital art:
A {request.gender} {request.race} {request.character_class} named {request.name}.
{appearance_desc}
High quality fantasy illustration, detailed face, dramatic lighting, 
medieval fantasy style, painterly, heroic pose, portrait framing.
No text, no watermarks, professional fantasy art."""

    try:
        llm_key = get_llm_api_key("openai")
        if not llm_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service not configured"
            )
        
        image_gen = OpenAIImageGeneration(api_key=llm_key)
        images = await image_gen.generate_images(
            prompt=portrait_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            # Increment AI usage counter on success
            await increment_ai_usage(username)
            return {
                "success": True,
                "image_base64": image_base64,
                "message": f"Portrait of {request.name} created!"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No image was generated"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portrait generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate portrait: {str(e)}"
        )

# ==================== COMBAT TOKEN GENERATION ====================

async def ai_generate_token(
    request: TokenGenerateRequest,
    username: str = Depends(get_current_user)
):
    """
    AI Token Generator: Create a circular battle map token for a creature.
    Stores the token in DB and returns URL.
    """
    # Build token prompt
    token_prompt = request.prompt or f"""Circular fantasy RPG battle map token portrait of {request.entity_name}, 
    {request.entity_type} creature, dramatic lighting, detailed, dark fantasy style, 
    facing forward, head and shoulders only, suitable for tabletop RPG battle map token,
    circular frame, high contrast, no background, professional fantasy game art."""

    try:
        llm_key = get_llm_api_key("openai")
        if not llm_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service not configured"
            )
        
        image_gen = OpenAIImageGeneration(api_key=llm_key)
        images = await image_gen.generate_images(
            prompt=token_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            
            # Store token in database
            token_doc = {
                'id': str(uuid.uuid4()),
                'entity_id': request.entity_id,
                'entity_name': request.entity_name,
                'entity_type': request.entity_type,
                'campaign_id': request.campaign_id,
                'image_base64': image_base64,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'created_by': username
            }
            
            # Upsert - update if exists, insert if not
            await db.combat_tokens.update_one(
                {'entity_id': request.entity_id, 'campaign_id': request.campaign_id},
                {'$set': token_doc},
                upsert=True
            )
            
            return {
                "success": True,
                "image_url": f"data:image/png;base64,{image_base64}",
                "entity_id": request.entity_id,
                "message": f"Token created for {request.entity_name}!"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No image was generated"
            )
            
    except Exception as e:
        logger.error(f"Token generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate token: {str(e)}"
        )

@router.get("/campaigns/{campaign_id}/tokens")
async def get_campaign_tokens(
    campaign_id: str,
    username: str = Depends(get_current_user)
):
    """Get all combat tokens for a campaign"""
    tokens = await db.combat_tokens.find(
        {'campaign_id': campaign_id},
        {'_id': 0, 'image_base64': 0}  # Don't return full base64 in list
    ).to_list(200)
    
    # Return tokens with image URLs
    result = []
    for token in tokens:
        token_data = await db.combat_tokens.find_one(
            {'id': token['id']},
            {'_id': 0}
        )
        if token_data and token_data.get('image_base64'):
            token['image_url'] = f"data:image/png;base64,{token_data['image_base64']}"
        result.append(token)
    
    return result

@router.get("/campaigns/{campaign_id}/tokens/{entity_id}")
async def get_entity_token(
    campaign_id: str,
    entity_id: str,
    username: str = Depends(get_current_user)
):
    """Get a specific combat token"""
    token = await db.combat_tokens.find_one(
        {'entity_id': entity_id, 'campaign_id': campaign_id},
        {'_id': 0}
    )
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    if token.get('image_base64'):
        token['image_url'] = f"data:image/png;base64,{token['image_base64']}"
        del token['image_base64']  # Don't expose raw base64
    
    return token

async def generate_session_recap(request: SessionRecapRequest, username: str = Depends(get_current_user)):
    """Generate an AI-powered session recap from notes"""
    
    # Build prompt based on style and sections
    sections_text = ", ".join(request.sections)
    
    style_instructions = {
        "narrative": "Write in a flowing narrative style, like a story being told by a bard.",
        "bullet": "Use concise bullet points for each key element.",
        "detailed": "Provide a detailed, comprehensive log with timestamps and full descriptions."
    }
    
    prompt = f"""You are a Game Master's assistant. Generate a session recap from the following notes.

{ai_source_boundary_fragment()}

Style: {style_instructions.get(request.style, style_instructions['narrative'])}

Include these sections (if relevant content exists): {sections_text}

Session Notes:
{request.notes}

Generate a well-formatted recap that captures the key events, NPCs, locations, combat highlights, and any plot developments. Make it useful for both the GM to reference later and to share with players as a "previously on" summary.

Format the output in Markdown."""

    try:
        llm_api_key = get_llm_api_key("openai")
        if not llm_api_key:
            raise Exception("No API key")

        chat = LlmChat(
            api_key=llm_api_key,
            session_id=f"session-recap-{request.campaign_id}-{uuid.uuid4().hex[:8]}",
            system_message=f"You turn tabletop RPG session notes into concise player-facing recaps.\n\n{ai_source_boundary_fragment()}"
        ).with_model("openai", "gpt-4o-mini")

        content = await chat.send_message(UserMessage(text=prompt))
        
    except Exception as e:
        logger.warning(f"AI recap generation failed: {e}")
        # Fallback to simple extraction
        lines = request.notes.split('\n')
        content = "# Session Recap\n\n"
        content += "*Auto-generated summary*\n\n"
        content += "## Key Events\n"
        for line in lines[:10]:
            if line.strip():
                content += f"- {line.strip()}\n"
        content += "\n## Next Session\n- Continue from current situation\n"
    
    recap = {
        "content": content,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "style": request.style,
        "word_count": len(content.split())
    }
    
    # Optionally save to database
    recap['campaign_id'] = request.campaign_id
    recap['generated_by'] = username
    recap['id'] = str(uuid.uuid4())
    await db.session_recaps.insert_one(recap)
    
    return recap

@router.get("/ai/session-recaps/{campaign_id}")
async def get_session_recaps(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all session recaps for a campaign"""
    await verify_campaign_membership(campaign_id, username)
    recaps = await db.session_recaps.find(
        {'campaign_id': campaign_id},
        {'_id': 0}
    ).sort('generated_at', -1).to_list(50)
    return {"recaps": recaps}

@router.post("/ai/session-outline/{campaign_id}")
async def generate_session_outline(campaign_id: str, request: Dict[str, Any], username: str = Depends(get_current_user)):
    """AI generates a session outline based on campaign context (notes, NPCs, locations, journal)."""
    await verify_campaign_ownership(campaign_id, username)

    api_key = get_llm_api_key("openai")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    notes = await db.ingame_notes.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(20)
    npcs = await db.npcs.find({'campaign_id': campaign_id}, {'_id': 0, 'name': 1, 'role': 1, 'description': 1}).to_list(30)
    locations = await db.locations.find({'campaign_id': campaign_id}, {'_id': 0, 'name': 1, 'description': 1, 'type': 1}).to_list(20)
    journal = await db.player_journal.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(10)
    saved_campaign_context = await get_campaign_context(campaign_id, limit=8)

    notes_text = "\n".join([f"- {n.get('title','')}: {n.get('content','')}" for n in notes[:10]]) or "No session notes yet."
    npcs_text = "\n".join([f"- {n.get('name','Unknown')}: {n.get('role','')}" for n in npcs[:15]]) or "No NPCs."
    locs_text = "\n".join([f"- {l.get('name','Unknown')} ({l.get('type','')})" for l in locations[:10]]) or "No locations."
    journal_text = "\n".join([f"- {j.get('title','')}: {j.get('content','')[:200]}" for j in journal[:5]]) or "No journal entries."

    focus = request.get('focus', 'balanced')
    tone = request.get('tone', 'classic fantasy')
    extra_notes = request.get('gm_notes', '')

    prompt = f"""You are an expert TTRPG session planner. Generate a detailed session outline for the next game session.

{ai_source_boundary_fragment()}

Campaign: {campaign.get('name', 'Unknown')}
Setting label: {campaign.get('setting', 'Fantasy')} (tone only, not lore)
GM Focus: {focus}
Tone: {tone}
{f"GM Additional Notes: {extra_notes}" if extra_notes else ""}

RULES EDITION:
{edition_prompt_fragment(campaign)}

Recent Session Notes:
{notes_text}

Active NPCs:
{npcs_text}

Known Locations:
{locs_text}

Player Journal Highlights:
{journal_text}

Saved Campaign Context:
{saved_campaign_context or "No additional saved campaign context."}

Generate a structured session outline in Markdown with these sections:
## Session Hook
A compelling opening scene or event to kick off the session.

## Key Scenes (3-5)
Each scene should have:
- **Location**: Where it takes place
- **NPCs Present**: Who is there
- **Goal**: What the players should accomplish or discover
- **Possible Complications**: What could go wrong
- **Transition**: How to move to the next scene

## Combat Encounters (if applicable)
- Suggested enemies and difficulty
- Tactical notes for the GM

## Roleplaying Moments
- Key NPC interactions and dialogue hooks
- Moral dilemmas or decisions

## Session Cliffhanger
An ending hook to leave players eager for next session.

## GM Prep Checklist
- Maps, tokens, or handouts needed
- Music/atmosphere suggestions"""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"outline-{campaign_id}-{uuid.uuid4().hex[:8]}",
            system_message=f"You are a master TTRPG session planner. Create engaging, well-paced session outlines that balance combat, roleplay, and exploration.\n\n{ai_source_boundary_fragment()}"
        ).with_model("openai", "gpt-5.2")

        response = await chat.send_message(UserMessage(text=prompt))
        content = response.strip() if isinstance(response, str) else str(response)

        outline = {
            'id': str(uuid.uuid4()),
            'campaign_id': campaign_id,
            'content': content,
            'focus': focus,
            'tone': tone,
            'generated_by': username,
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.session_outlines.insert_one(outline)
        del outline['_id']
        return outline

    except Exception as e:
        logger.error(f"Session outline generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.get("/ai/session-outlines/{campaign_id}")
async def get_session_outlines(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all generated session outlines for a campaign."""
    await verify_campaign_ownership(campaign_id, username)
    outlines = await db.session_outlines.find(
        {'campaign_id': campaign_id}, {'_id': 0}
    ).sort('generated_at', -1).to_list(20)
    return {"outlines": outlines}


@router.post("/ai/session-checklist/{campaign_id}")
async def generate_session_checklist(campaign_id: str, request: Dict[str, Any], username: str = Depends(get_current_user)):
    """AI generates a prep checklist from a session outline or campaign context."""
    await verify_campaign_ownership(campaign_id, username)

    api_key = get_llm_api_key("openai")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    outline_id = request.get('outline_id')
    outline_content = ""
    outline_ref = None

    if outline_id:
        outline_doc = await db.session_outlines.find_one({'id': outline_id, 'campaign_id': campaign_id}, {'_id': 0})
        if outline_doc:
            outline_content = outline_doc.get('content', '')
            outline_ref = outline_id

    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    campaign_name = campaign.get('name', 'Unknown') if campaign else 'Unknown'

    if not outline_content:
        notes = await db.ingame_notes.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(5)
        outline_content = "\n".join([f"- {n.get('title','')}: {n.get('content','')[:300]}" for n in notes]) or "No context available."

    prompt = f"""You are a TTRPG session prep assistant. Based on the following session outline/context, generate a detailed prep checklist for the Game Master.

{ai_source_boundary_fragment()}

Campaign: {campaign_name}

RULES EDITION:
{edition_prompt_fragment(campaign)}

Session Outline/Context:
{outline_content}

Generate a JSON array of checklist items. Each item should have:
- "category": one of "npcs", "maps", "encounters", "loot", "story", "atmosphere", "handouts", "rules"
- "text": the checklist item description (concise, actionable)
- "priority": "high", "medium", or "low"

Return ONLY a valid JSON array like:
[
  {{"category": "npcs", "text": "Prepare voice/accent for tavern keeper Marla", "priority": "high"}},
  {{"category": "encounters", "text": "Set up goblin ambush encounter (4x goblins, 1 bugbear)", "priority": "high"}},
  {{"category": "maps", "text": "Draw map of the abandoned mine entrance", "priority": "medium"}},
  {{"category": "loot", "text": "Roll loot table for dungeon chest (DMG p.137)", "priority": "low"}}
]

Generate 8-15 practical checklist items. Return ONLY the JSON array, no other text."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"checklist-{campaign_id}-{uuid.uuid4().hex[:8]}",
            system_message=f"You are a practical TTRPG session prep assistant. Generate actionable, specific checklist items.\n\n{ai_source_boundary_fragment()}"
        ).with_model("openai", "gpt-4o")

        response = await chat.send_message(UserMessage(text=prompt))
        response_text = response.strip() if isinstance(response, str) else str(response)

        json_match = re.search(r'\[[\s\S]*\]', response_text)
        if not json_match:
            raise HTTPException(status_code=500, detail="Failed to parse AI checklist response")

        items_raw = json.loads(json_match.group())
        items = []
        for i, item in enumerate(items_raw):
            items.append({
                'id': str(uuid.uuid4()),
                'category': item.get('category', 'story'),
                'text': item.get('text', ''),
                'priority': item.get('priority', 'medium'),
                'completed': False,
                'order': i,
            })

        checklist = {
            'id': str(uuid.uuid4()),
            'campaign_id': campaign_id,
            'outline_id': outline_ref,
            'items': items,
            'generated_by': username,
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.session_checklists.insert_one(checklist)
        del checklist['_id']
        return checklist

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session checklist generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.get("/ai/session-checklists/{campaign_id}")
async def get_session_checklists(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all session prep checklists for a campaign."""
    await verify_campaign_ownership(campaign_id, username)
    checklists = await db.session_checklists.find(
        {'campaign_id': campaign_id}, {'_id': 0}
    ).sort('generated_at', -1).to_list(20)
    return {"checklists": checklists}


@router.patch("/ai/session-checklist/{checklist_id}")
async def update_session_checklist(checklist_id: str, request: Dict[str, Any], username: str = Depends(get_current_user)):
    """Update checklist item completion status."""
    checklist = await db.session_checklists.find_one({'id': checklist_id})
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    await verify_campaign_ownership(checklist.get('campaign_id'), username)

    item_id = request.get('item_id')
    completed = request.get('completed')
    if item_id is not None and completed is not None:
        items = checklist.get('items', [])
        for item in items:
            if item['id'] == item_id:
                item['completed'] = completed
                break
        await db.session_checklists.update_one(
            {'id': checklist_id},
            {'$set': {'items': items}}
        )

    updated = await db.session_checklists.find_one({'id': checklist_id}, {'_id': 0})
    return updated


@router.post("/ai/session-replay/{campaign_id}")
async def generate_session_replay(campaign_id: str, request: Dict[str, Any], username: str = Depends(get_current_user)):
    """AI generates a narrative recap of the session from combat logs, notes, and dice rolls."""
    await verify_campaign_ownership(campaign_id, username)

    api_key = get_llm_api_key("openai")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    campaign = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    notes = await db.ingame_notes.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(15)
    journal = await db.player_journal.find({'campaign_id': campaign_id}, {'_id': 0}).sort('created_at', -1).to_list(10)
    characters = await db.player_characters.find({'campaign_id': campaign_id}, {'_id': 0, 'name': 1, 'race': 1, 'class_name': 1, 'level': 1}).to_list(10)

    notes_text = "\n".join([f"- {n.get('title','')}: {n.get('content','')}" for n in notes[:10]]) or "No notes."
    journal_text = "\n".join([f"- {j.get('title','')}: {j.get('content','')[:300]}" for j in journal[:5]]) or "No journal."
    chars_text = "\n".join([f"- {c.get('name','')}, Level {c.get('level',1)} {c.get('race','')} {c.get('class_name','')}" for c in characters]) or "No characters."

    style = request.get('style', 'narrative')
    session_number = request.get('session_number', '')
    extra_context = request.get('extra_context', '')

    style_map = {
        'narrative': 'Write as an epic tale told by a bard at a tavern. Use vivid descriptions, dialogue, and dramatic pacing.',
        'chronicle': 'Write as a historical chronicle. Factual, structured, with clear dates/events and formal language.',
        'comedic': 'Write with humor and wit. Highlight funny moments, puns, and the absurd situations the party got into.',
        'dark': 'Write with a grim, dark fantasy tone. Emphasize danger, loss, and the harsh realities of adventuring.',
    }

    prompt = f"""You are a master storyteller creating a session replay for a TTRPG campaign.

{ai_source_boundary_fragment()}

Campaign: {campaign.get('name', 'Unknown')}
{f"Session #{session_number}" if session_number else ""}
Style: {style_map.get(style, style_map['narrative'])}
{f"Additional Context: {extra_context}" if extra_context else ""}

Party Members:
{chars_text}

Session Notes:
{notes_text}

Player Journal Entries:
{journal_text}

Write a compelling session replay in Markdown. Include:
1. **Opening Scene** — Set the stage with atmosphere and location
2. **The Adventure** — Narrate key events, combat, discoveries, and NPC interactions
3. **Dramatic Moments** — Highlight critical rolls, heroic actions, or devastating failures
4. **Resolution** — How the session ended, what was accomplished
5. **Teaser** — A mysterious hint or cliffhanger for next session

Make it feel like reading a fantasy novel chapter. Use character names and make them the heroes of the story."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"replay-{campaign_id}-{uuid.uuid4().hex[:8]}",
            system_message=f"You are a legendary bard who transforms TTRPG session notes into gripping narrative recaps.\n\n{ai_source_boundary_fragment()}"
        ).with_model("openai", "gpt-5.2")

        response = await chat.send_message(UserMessage(text=prompt))
        content = response.strip() if isinstance(response, str) else str(response)

        replay = {
            'id': str(uuid.uuid4()),
            'campaign_id': campaign_id,
            'content': content,
            'style': style,
            'session_number': session_number,
            'generated_by': username,
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.session_replays.insert_one(replay)
        del replay['_id']
        return replay

    except Exception as e:
        logger.error(f"Session replay generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.get("/ai/session-replays/{campaign_id}")
async def get_session_replays(campaign_id: str, username: str = Depends(get_current_user)):
    """Get all generated session replays for a campaign."""
    await verify_campaign_ownership(campaign_id, username)
    replays = await db.session_replays.find(
        {'campaign_id': campaign_id}, {'_id': 0}
    ).sort('generated_at', -1).to_list(20)
    return {"replays": replays}


# ==================== CHARACTER MULTICLASS SUPPORT ====================


