"""The NPC update schema must support all enriched GM statblock data.

The edit route uses NPCUpdate.model_dump() to form its $set document. Fields
missing from NPCUpdate are silently dropped, so this is a data-integrity test.
"""
from models import NPC, NPCAttack, NPCUpdate


def test_npc_update_accepts_advanced_combat_sections():
    patch = NPCUpdate(
        cr="5", armor="Plate armour", size="Large",
        backstory="Tia-Karta shared history; Wednesday consequences differ.",
        stats={"strength": 18, "dexterity": 12, "constitution": 15,
               "intelligence": 10, "wisdom": 11, "charisma": 13},
        actions=[{"name": "Hammer", "bonus": "+8", "damage": "2d8+4 bludgeoning", "recharge": "5-6"}],
        bonus_actions=[{"name": "Commander", "description": "Ally moves without OA"}],
        reactions=[{"name": "Interpose", "description": "Reduce incoming damage"}],
        legendary_actions=[{"name": "Shift", "description": "Move up to speed"}],
        special_abilities=[{"name": "Bravery", "description": "Advantage vs fear"}],
        skills=["Athletics +8"], saving_throws=["STR +8"], languages="Common",
        mechanics_status="DM DRAFT", canon_status="CANON IDENTITY",
        statblock_source="OneDrive campaign compendium", statblock_notes="GM-only ruling",
        dm_only=True, combat_ready=False,
    )
    result = patch.model_dump(exclude_none=True)
    assert result["cr"] == "5"
    assert result["armor"] == "Plate armour"
    assert result["backstory"].startswith("Tia-Karta")
    assert result["actions"][0]["recharge"] == "5-6"
    assert result["bonus_actions"][0]["name"] == "Commander"
    assert result["reactions"][0]["name"] == "Interpose"
    assert result["legendary_actions"][0]["name"] == "Shift"
    assert result["statblock_notes"] == "GM-only ruling"
    assert result["combat_ready"] is False


def test_extra_attack_details_survive_response_validation_and_an_edit():
    rich = {"name": "Scarab Strike", "bonus": "+6", "damage": "2d6 poison",
            "notes": "Sting", "recharge": "5-6", "uses": "3 per day"}
    assert NPCAttack.model_validate(rich).model_dump() == rich
    saved = NPC(name="Scarab Guardian", campaign_id="wednesday", attacks=[rich])
    assert saved.model_dump()["attacks"][0] == rich
    update = NPCUpdate(attacks=[rich])
    assert update.model_dump(exclude_none=True)["attacks"][0] == rich


def test_partial_edit_omits_unmodified_stats_and_does_not_reset_hp():
    patch = NPCUpdate(notes="New GM note")
    result = patch.model_dump(exclude_none=True)
    assert result == {"notes": "New GM note"}
