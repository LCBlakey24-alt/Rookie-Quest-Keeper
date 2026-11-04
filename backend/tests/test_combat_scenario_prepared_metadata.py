"""Regression: prepared-encounter metadata must survive the GM combat API."""
from models import CombatScenario
from utils.resilient_records import serialise_record


def test_prepared_combat_metadata_is_not_stripped():
    record = {
        "id": "sw-hm-01-ceiling-skitter-20261104",
        "campaign_id": "spilsby-wednesday",
        "name": "HM-01 — Ceiling Skitter Ambush",
        "combatants": [
            {"id": "rina", "type": "player", "name": "Rina Ironside", "hp": 54, "ac": 19},
            {"id": "guard", "type": "monster", "name": "Chitin Guard", "hp": 22, "ac": 14},
        ],
        "live_ready": True,
        "live_default": True,
        "planned_encounter_order": 1,
        "legacy": False,
        "played": False,
    }
    result = serialise_record(CombatScenario, record)
    assert result["live_ready"] is True
    assert result["live_default"] is True
    assert result["planned_encounter_order"] == 1
    assert result["legacy"] is False
    assert result["played"] is False
    assert result["combatants"] == record["combatants"]


def test_old_scenarios_remain_compatible_and_unready():
    result = serialise_record(CombatScenario, {
        "id": "old",
        "campaign_id": "spilsby-wednesday",
        "name": "Old scenario",
        "combatants": [],
    })
    assert result["live_ready"] is False
    assert result["live_default"] is False
    assert result["planned_encounter_order"] is None
