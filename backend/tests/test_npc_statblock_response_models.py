"""Regression checks for enriched campaign NPCs loaded through the roster API.

A single malformed spell slot in an NPC used to make response_model=List[NPC]
fail, leaving the entire roster looking empty. Rich GM stat blocks also lost
their action/reaction/CR fields when serialised by the old NPC response model.
"""
from pydantic import TypeAdapter

from models import NPC


def _sample_npc(name: str, slots=None):
    return {
        "id": f"npc-{name.lower().replace(' ', '-')}",
        "campaign_id": "wednesday",
        "name": name,
        "hp": 102,
        "max_hp": 102,
        "ac": 15,
        "stats": {"strength": 9, "dexterity": 12, "constitution": 16,
                  "intelligence": 13, "wisdom": 19, "charisma": 15},
        "description": "An established Tia-Karta character",
        "backstory": "Kept separately for the Wednesday party.",
        "notes": "The GM's full private reference",
        "cr": None,
        "armor": "Not established",
        "skills": ["Nature +5", "Perception +8"],
        "actions": [{"name": "Thorn Lash", "bonus": "+8", "damage": "2d6+4 piercing"}],
        "bonus_actions": [{"name": "Root Step", "description": "Move 15 feet"}],
        "reactions": [{"name": "Barkskin Ward", "description": "Gain +3 AC"}],
        "legendary_actions": [],
        "mechanics_status": "DM DRAFT",
        "dm_only": True,
        "spells": {
            "casting_ability": "Wisdom",
            "spell_save_dc": 16,
            "spell_attack_bonus": 8,
            "slot_level": slots,
            "slot_count": slots,
            "note": "Spell slots not established in source",
        },
    }


def test_nullable_spell_slots_do_not_break_an_entire_campaign_roster():
    # Exactly the shape of source-derived spell info that used to trigger
    # response validation errors for both Friday and Wednesday rosters.
    entries = [_sample_npc("Mabel Barleybrook"), _sample_npc("Jordan Crow", 2)]
    roster = TypeAdapter(list[NPC]).validate_python(entries)
    dumped = [record.model_dump(mode="json") for record in roster]
    assert len(dumped) == 2
    assert dumped[0]["spells"]["slot_level"] is None
    assert dumped[0]["spells"]["slot_count"] is None
    assert dumped[1]["spells"]["slot_count"] == 2


def test_npc_response_preserves_enriched_stat_block_lore_and_actions():
    original = _sample_npc("Mabel Barleybrook")
    serialized = NPC.model_validate(original).model_dump(mode="json")
    for key in ("hp", "max_hp", "ac", "stats", "skills", "notes",
                "backstory", "cr", "armor", "actions", "bonus_actions",
                "reactions", "legendary_actions", "mechanics_status", "dm_only"):
        assert serialized[key] == original[key], key
    assert serialized["spells"]["note"] == original["spells"]["note"]
