"""Character template routes: premade characters and AI matching."""
from fastapi import APIRouter, HTTPException, Depends, status
from config import db, logger
from utils.auth import get_current_user
from models import TemplateMatchRequest
from typing import Optional
import os

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
except ImportError:
    LlmChat = None
    UserMessage = None
    EMERGENT_KEY = None

router = APIRouter()

# ============================================
# Premade character templates (SRD-safe)
# ============================================
PREMADE_TEMPLATES = [
    {
        "id": "tmpl-thorne-fighter",
        "ruleset_id": "dnd5e_2014",
        "name": "Thorne the Blade",
        "pitch": "A disciplined swordsman who never backs down from a righteous fight.",
        "character_class": "Fighter",
        "race": "Human",
        "subrace": "",
        "background": "Soldier",
        "alignment": "Lawful Good",
        "ability_scores": {"strength": 15, "dexterity": 13, "constitution": 14, "intelligence": 10, "wisdom": 12, "charisma": 8},
        "skill_proficiencies": ["Athletics", "Intimidation"],
        "fighting_style": "Defense",
        "equipment_pick": "chain_mail",
        "playstyle_tags": ["frontline", "tank", "martial", "leader"]
    },
    {
        "id": "tmpl-elara-wizard",
        "ruleset_id": "dnd5e_2014",
        "name": "Elara Moonveil",
        "pitch": "A curious elven scholar seeking the lost magic of her ancestors.",
        "character_class": "Wizard",
        "race": "Elf",
        "subrace": "High Elf",
        "background": "Sage",
        "alignment": "Neutral Good",
        "ability_scores": {"strength": 8, "dexterity": 14, "constitution": 13, "intelligence": 15, "wisdom": 12, "charisma": 10},
        "skill_proficiencies": ["Arcana", "Investigation"],
        "cantrips_known": ["Fire Bolt", "Mage Hand", "Prestidigitation"],
        "spells_known": ["Magic Missile", "Shield", "Mage Armor", "Detect Magic", "Sleep", "Burning Hands"],
        "playstyle_tags": ["caster", "ranged", "scholar", "control"]
    },
    {
        "id": "tmpl-shade-rogue",
        "ruleset_id": "dnd5e_2014",
        "name": "Shade",
        "pitch": "A halfling thief with a soft spot for underdogs and shiny objects.",
        "character_class": "Rogue",
        "race": "Halfling",
        "subrace": "Lightfoot",
        "background": "Urchin",
        "alignment": "Chaotic Good",
        "ability_scores": {"strength": 8, "dexterity": 15, "constitution": 13, "intelligence": 12, "wisdom": 10, "charisma": 14},
        "skill_proficiencies": ["Stealth", "Sleight of Hand", "Perception", "Deception"],
        "expertise": ["Stealth", "Sleight of Hand"],
        "playstyle_tags": ["stealth", "skirmisher", "trickster", "scout"]
    },
    {
        "id": "tmpl-bromm-cleric",
        "ruleset_id": "dnd5e_2014",
        "name": "Bromm Ironbeard",
        "pitch": "A stalwart dwarven priest of the forge, hammer in hand and faith in heart.",
        "character_class": "Cleric",
        "race": "Dwarf",
        "subrace": "Hill Dwarf",
        "background": "Acolyte",
        "alignment": "Lawful Good",
        "ability_scores": {"strength": 14, "dexterity": 10, "constitution": 15, "intelligence": 8, "wisdom": 15, "charisma": 12},
        "skill_proficiencies": ["Religion", "Medicine"],
        "subclass": "Life Domain",
        "cantrips_known": ["Sacred Flame", "Guidance", "Thaumaturgy"],
        "playstyle_tags": ["support", "healer", "frontline", "divine"]
    },
    {
        "id": "tmpl-kara-barbarian",
        "ruleset_id": "dnd5e_2014",
        "name": "Kara Stormfist",
        "pitch": "A half-orc warrior whose rage is only matched by her loyalty.",
        "character_class": "Barbarian",
        "race": "Half-Orc",
        "subrace": "",
        "background": "Outlander",
        "alignment": "Chaotic Neutral",
        "ability_scores": {"strength": 15, "dexterity": 13, "constitution": 15, "intelligence": 8, "wisdom": 12, "charisma": 10},
        "skill_proficiencies": ["Athletics", "Survival"],
        "playstyle_tags": ["berserker", "frontline", "damage", "tank"]
    },
    {
        "id": "tmpl-lysander-bard",
        "ruleset_id": "dnd5e_2014",
        "name": "Lysander Vex",
        "pitch": "A silver-tongued tiefling performer who talks his way out of trouble... usually.",
        "character_class": "Bard",
        "race": "Tiefling",
        "subrace": "",
        "background": "Entertainer",
        "alignment": "Chaotic Good",
        "ability_scores": {"strength": 8, "dexterity": 14, "constitution": 13, "intelligence": 10, "wisdom": 12, "charisma": 15},
        "skill_proficiencies": ["Performance", "Persuasion", "Deception"],
        "cantrips_known": ["Vicious Mockery", "Minor Illusion"],
        "spells_known": ["Healing Word", "Faerie Fire", "Charm Person", "Thunderwave"],
        "playstyle_tags": ["support", "face", "caster", "utility"]
    },
    {
        "id": "tmpl-fenn-ranger",
        "ruleset_id": "dnd5e_2014",
        "name": "Fenn Treewalker",
        "pitch": "A wood elf hunter bound to the wilds and the creatures within.",
        "character_class": "Ranger",
        "race": "Elf",
        "subrace": "Wood Elf",
        "background": "Outlander",
        "alignment": "Neutral Good",
        "ability_scores": {"strength": 12, "dexterity": 15, "constitution": 14, "intelligence": 10, "wisdom": 15, "charisma": 8},
        "skill_proficiencies": ["Survival", "Perception", "Stealth"],
        "fighting_style": "Archery",
        "playstyle_tags": ["ranged", "skirmisher", "survivalist", "scout"]
    },
    {
        "id": "tmpl-selene-druid",
        "ruleset_id": "dnd5e_2014",
        "name": "Selene of the Grove",
        "pitch": "A gnome druid who speaks with beasts and calls the storm when crossed.",
        "character_class": "Druid",
        "race": "Gnome",
        "subrace": "Forest Gnome",
        "background": "Hermit",
        "alignment": "Neutral",
        "ability_scores": {"strength": 8, "dexterity": 14, "constitution": 13, "intelligence": 12, "wisdom": 15, "charisma": 10},
        "skill_proficiencies": ["Nature", "Animal Handling"],
        "cantrips_known": ["Druidcraft", "Produce Flame"],
        "playstyle_tags": ["shapeshifter", "support", "nature", "caster"]
    },
    {
        "id": "tmpl-rook-paladin",
        "ruleset_id": "dnd5e_2014",
        "name": "Sir Rook Brightshield",
        "pitch": "A human oathsworn knight who carries hope like a banner.",
        "character_class": "Paladin",
        "race": "Human",
        "subrace": "",
        "background": "Noble",
        "alignment": "Lawful Good",
        "ability_scores": {"strength": 15, "dexterity": 10, "constitution": 14, "intelligence": 8, "wisdom": 12, "charisma": 15},
        "skill_proficiencies": ["Persuasion", "Religion"],
        "fighting_style": "Protection",
        "playstyle_tags": ["frontline", "tank", "support", "divine", "leader"]
    },
    {
        "id": "tmpl-vex-warlock",
        "ruleset_id": "dnd5e_2014",
        "name": "Vex the Bound",
        "pitch": "A human warlock who struck a deal with an ancient power... and pays the price.",
        "character_class": "Warlock",
        "race": "Human",
        "subrace": "",
        "background": "Hermit",
        "alignment": "Chaotic Neutral",
        "ability_scores": {"strength": 8, "dexterity": 13, "constitution": 14, "intelligence": 10, "wisdom": 12, "charisma": 15},
        "skill_proficiencies": ["Arcana", "Deception"],
        "cantrips_known": ["Eldritch Blast", "Chill Touch"],
        "spells_known": ["Hex", "Armor of Agathys"],
        "subclass": "The Fiend",
        "playstyle_tags": ["caster", "ranged", "damage", "dark"]
    },
    {
        "id": "tmpl-ember-sorcerer",
        "ruleset_id": "dnd5e_2014",
        "name": "Ember Kael",
        "pitch": "A dragonblooded sorcerer whose temper burns as hot as her spellwork.",
        "character_class": "Sorcerer",
        "race": "Human",
        "subrace": "",
        "background": "Folk Hero",
        "alignment": "Chaotic Good",
        "ability_scores": {"strength": 8, "dexterity": 13, "constitution": 14, "intelligence": 10, "wisdom": 12, "charisma": 15},
        "skill_proficiencies": ["Arcana", "Persuasion"],
        "cantrips_known": ["Fire Bolt", "Prestidigitation", "Shocking Grasp", "Mage Hand"],
        "spells_known": ["Burning Hands", "Shield"],
        "subclass": "Draconic Bloodline",
        "playstyle_tags": ["caster", "damage", "ranged", "face"]
    },
    {
        "id": "tmpl-shen-monk",
        "ruleset_id": "dnd5e_2014",
        "name": "Shen of the Open Palm",
        "pitch": "A halfling monk who fights with fists, breath, and serenity.",
        "character_class": "Monk",
        "race": "Halfling",
        "subrace": "Stout",
        "background": "Hermit",
        "alignment": "Lawful Neutral",
        "ability_scores": {"strength": 12, "dexterity": 15, "constitution": 14, "intelligence": 10, "wisdom": 15, "charisma": 8},
        "skill_proficiencies": ["Acrobatics", "Insight"],
        "playstyle_tags": ["skirmisher", "martial", "mobility", "defender"]
    }
]


def _summarize_template(t):
    return {
        "id": t["id"],
        "name": t["name"],
        "pitch": t["pitch"],
        "character_class": t["character_class"],
        "race": t["race"],
        "subrace": t.get("subrace", ""),
        "background": t.get("background", ""),
        "alignment": t.get("alignment", "Neutral"),
        "playstyle_tags": t.get("playstyle_tags", []),
        "ruleset_id": t.get("ruleset_id", "dnd5e_2014"),
    }


@router.get("/character-templates")
async def list_character_templates(
    ruleset_id: Optional[str] = None,
    username: str = Depends(get_current_user)
):
    """List premade character templates, optionally filtered by ruleset."""
    templates = PREMADE_TEMPLATES
    if ruleset_id:
        templates = [t for t in templates if t.get("ruleset_id", "dnd5e_2014") == ruleset_id]
    return {"templates": [_summarize_template(t) for t in templates]}


@router.get("/character-templates/{template_id}")
async def get_character_template(
    template_id: str,
    username: str = Depends(get_current_user)
):
    template = next((t for t in PREMADE_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template


@router.post("/character-templates/ai-match")
async def ai_match_template(
    request: TemplateMatchRequest,
    username: str = Depends(get_current_user)
):
    """Match a playstyle description to the closest premade template. Falls back to tag scoring if AI unavailable."""
    description = (request.description or "").lower().strip()
    if not description:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Describe how you want to play")

    templates = [t for t in PREMADE_TEMPLATES if t.get("ruleset_id", "dnd5e_2014") == request.ruleset_id]
    if not templates:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No templates available for that ruleset")

    # Simple tag-keyword scoring (fast fallback; AI is optional)
    keyword_map = {
        "tank": ["tank", "defender", "frontline"],
        "melee": ["frontline", "martial", "skirmisher"],
        "heal": ["healer", "support", "divine"],
        "support": ["support", "leader", "face"],
        "stealth": ["stealth", "skirmisher", "scout", "trickster"],
        "magic": ["caster", "scholar", "dark"],
        "caster": ["caster"],
        "ranged": ["ranged"],
        "face": ["face", "leader"],
        "nature": ["nature", "survivalist", "scout"],
        "fire": ["damage", "caster"],
        "shadow": ["stealth", "dark", "trickster"],
    }
    scores = []
    for t in templates:
        tags = set(t.get("playstyle_tags", []))
        score = 0
        for word in description.split():
            w = word.strip(",.!?'\"")
            for k, vs in keyword_map.items():
                if k in w or w in k:
                    for v in vs:
                        if v in tags:
                            score += 2
            if w in tags:
                score += 3
        scores.append((score, t))
    scores.sort(key=lambda x: x[0], reverse=True)
    best_score, best = scores[0]

    # If AI available, ask it to refine the match reason (non-blocking fallback)
    rationale = None
    if LlmChat and UserMessage and EMERGENT_KEY and best_score > 0:
        try:
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"template-match-{username}",
                system_message="You help TTRPG players pick a premade character. Respond in ONE sentence (<=40 words)."
            ).with_model("openai", "gpt-4o-mini")
            user_msg = UserMessage(text=f"Player wants: '{description}'. Best match is {best['name']} ({best['character_class']}). Why is this a good fit?")
            ai_reply = await chat.send_message(user_msg)
            rationale = (ai_reply or "").strip()
        except Exception as e:
            logger.warning(f"AI match rationale failed: {e}")

    return {
        "best_match": _summarize_template(best),
        "score": best_score,
        "rationale": rationale or f"Playstyle tags for {best['name']} align with: {', '.join(best.get('playstyle_tags', [])[:3])}.",
        "alternatives": [_summarize_template(t) for _, t in scores[1:4] if _ > 0]
    }
