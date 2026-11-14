"""Word NPC fields must reach the existing NPC data model intact."""
import pytest

from routes.campaign_workbook_import import _models
from utils.campaign_workbook import WorkbookError


def test_combat_stats_attacks_abilities_and_spellcasting_survive_validation():
    npc = _models("NPC", {
        "name": "Captain Saelen",
        "role": "Guard",
        "level": "5",
        "alignment": "Lawful Neutral",
        "hp": "42",
        "ac": "16",
        "strength": "18",
        "dexterity": "14",
        "constitution": "16",
        "intelligence": "10",
        "wisdom": "11",
        "charisma": "12",
        "skills": "Athletics; Perception",
        "saving_throws": "Strength, Constitution",
        "attacks": "Longsword | +7 | 1d8+4 slashing | versatile\nJavelin | +7 | 1d6+4 piercing",
        "abilities": "Extra Attack | Attack twice per Attack action",
        "casting_ability": "Wisdom",
        "spell_save_dc": "13",
        "cantrips": "Light, Guidance",
        "known_spells": "Cure Wounds; Shield",
        "slot_level": "1",
        "slot_count": "3",
    }).model_dump()
    assert npc["stats"]["strength"] == 18
    assert npc["stats"]["charisma"] == 12
    assert npc["hp"] == 42
    assert npc["max_hp"] == 42
    assert npc["ac"] == 16
    assert npc["skills"] == ["Athletics", "Perception"]
    assert npc["saving_throws"] == ["Strength", "Constitution"]
    assert npc["attacks"][0]["bonus"] == "+7"
    assert len(npc["attacks"]) == 2
    assert npc["abilities"][0]["name"] == "Extra Attack"
    assert npc["spells"]["spell_save_dc"] == 13
    assert npc["spells"]["known_spells"] == ["Cure Wounds", "Shield"]
    assert npc["mechanics_status"] == "unverified"
    assert npc["combat_ready"] is False
    assert npc["dm_only"] is True
    assert npc["player_discovery_status"] == "unknown"


def test_missing_ability_scores_do_not_trigger_imaginary_rerolls():
    npc = _models("NPC", {"name": "The Scribe", "intelligence": "16"}).model_dump()
    assert npc["stats"]["intelligence"] == 16
    assert npc["stats"]["strength"] == 10
    assert npc["mechanics_status"] == "unverified"


def test_invalid_attack_lines_rejected_before_any_records_are_saved():
    with pytest.raises(WorkbookError, match="attack"):
        _models("NPC", {"name": "Captain", "attacks": "Longsword +4 damage unknown"})


def test_invalid_scores_are_not_silently_coerced():
    with pytest.raises(WorkbookError, match="strength"):
        _models("NPC", {"name": "Captain", "strength": "superhuman"})
