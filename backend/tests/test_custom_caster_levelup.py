"""Focused regression tests for portable custom spellcasting class progression."""

import os
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "custom-caster-levelup-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from models import LevelUpRequest, PlayerCharacterCreate  # noqa: E402
from routes.character_progression_preflight import build_level_up_preflight  # noqa: E402
from routes.character_progression_state import (  # noqa: E402
    build_state_safe_level_up_update,
    preserve_pact_magic_resource,
    progression_spell_slot_totals,
)


def runesmith(*, mode="known", progression="full", level=1):
    spellcasting = {
        "ability": "intelligence",
        "type": mode,
        "progression": progression,
        "start_level": 1,
        "cantrips_level_1": 2,
        "spells_level_1": 3,
        "cantrips_by_level": {"1": 2, "4": 3},
        "spells_by_level": {"1": 3, "2": 4, "3": 5, "5": 7},
    }
    slots = {"1": 2} if level == 1 else {"1": 3}
    return {
        "id": "custom-runesmith",
        "name": "Ari Rune",
        "character_class": "Runesmith",
        "subclass": "",
        "level": level,
        "edition": "2014",
        "ruleset_id": "dnd5e_2014",
        "class_levels": {"Runesmith": level},
        "classes": [{"name": "Runesmith", "level": level, "subclass": ""}],
        "homebrew_spellcasting": spellcasting,
        "strength": 10,
        "dexterity": 12,
        "constitution": 14,
        "intelligence": 16,
        "wisdom": 10,
        "charisma": 8,
        "max_hit_points": 10,
        "current_hit_points": 6,
        "hit_dice_remaining": 0,
        "spell_slots": slots,
        "spell_slots_remaining": {"1": 1},
        "spells_known": [
            {"name": "Rune Ward", "level": 1, "sourceClass": "Runesmith"},
            {"name": "Glyph Lash", "level": 1, "sourceClass": "Runesmith"},
            {"name": "Stone Script", "level": 1, "sourceClass": "Runesmith"},
        ],
        "spells_prepared": [],
        "cantrips_known": [
            {"name": "Rune Spark", "level": 0, "sourceClass": "Runesmith"},
            {"name": "Mark", "level": 0, "sourceClass": "Runesmith"},
        ],
        "feats": [],
        "level_progression": {},
        "resources": {},
    }


class TestCustomCasterLevelUp(unittest.TestCase):
    def test_character_create_model_keeps_portable_spellcasting_contract(self):
        contract = runesmith()["homebrew_spellcasting"]
        payload = PlayerCharacterCreate(
            name="Ari Rune",
            race="Human",
            character_class="Runesmith",
            homebrew_spellcasting=contract,
        )
        self.assertEqual(payload.model_dump()["homebrew_spellcasting"], contract)

    def test_preflight_uses_authored_spell_growth_instead_of_builtin_registry(self):
        result = build_level_up_preflight(runesmith(), target_class="Runesmith")

        self.assertEqual(result["class_level_before"], 1)
        self.assertEqual(result["class_level_after"], 2)
        self.assertEqual(result["spell_selection_mode"], "known")
        self.assertEqual(result["spells_to_learn"], 1)
        self.assertEqual(result["cantrips_to_learn"], 0)
        self.assertEqual(result["spell_slots"], {"1": 3})
        self.assertEqual(result["progression_reference"]["source"], "homebrew-character-contract")

    def test_level_up_routes_new_known_spell_and_preserves_spent_slots(self):
        existing = runesmith()
        request = LevelUpRequest(
            new_level=2,
            new_class="Runesmith",
            hp_method="average",
            new_spells=[{"name": "Iron Sigil", "level": 1, "school": "Abjuration"}],
        )

        update = build_state_safe_level_up_update(existing, request, "Runesmith", "standard")

        self.assertEqual(update["spell_slots"], {"1": 3})
        self.assertEqual(update["spell_slots_remaining"], {"1": 2})
        self.assertIn(
            {"name": "Iron Sigil", "level": 1, "school": "Abjuration", "sourceClass": "Runesmith"},
            update["spells_known"],
        )
        self.assertEqual(update["level_progression"]["2"]["spell_selection_mode"], "known")
        self.assertEqual(update["level_progression"]["2"]["spell_destination"], "spells_known")
        self.assertLess(update["current_hit_points"], update["max_hit_points"])

    def test_custom_prepared_caster_adds_growth_to_prepared_list(self):
        existing = runesmith(mode="prepared")
        existing["spells_known"] = []
        existing["spells_prepared"] = [
            {"name": "Rune Ward", "level": 1, "sourceClass": "Runesmith"},
            {"name": "Glyph Lash", "level": 1, "sourceClass": "Runesmith"},
            {"name": "Stone Script", "level": 1, "sourceClass": "Runesmith"},
        ]
        request = LevelUpRequest(
            new_level=2,
            new_class="Runesmith",
            hp_method="average",
            new_spells=[{"name": "Iron Sigil", "level": 1}],
        )

        update = build_state_safe_level_up_update(existing, request, "Runesmith", "standard")

        self.assertNotIn("spells_known", update)
        self.assertEqual(len(update["spells_prepared"]), 4)
        self.assertEqual(update["level_progression"]["2"]["spell_destination"], "spells_prepared")

    def test_custom_pact_progression_preserves_spent_use_when_slot_level_changes(self):
        existing = runesmith(mode="known", progression="pact", level=4)
        existing["class_levels"] = {"Runesmith": 4}
        existing["spell_slots"] = {"2": 2}
        existing["spell_slots_remaining"] = {"2": 1}
        existing["resources"] = {
            "pact_magic": {
                "label": "Pact Magic",
                "current": 1,
                "remaining": 1,
                "max": 2,
                "slot_level": 2,
                "restore": "short-rest",
                "className": "Runesmith",
                "homebrew": True,
            }
        }

        totals = progression_spell_slot_totals(existing, {"Runesmith": 5})
        resources = preserve_pact_magic_resource(existing, {"class_levels": {"Runesmith": 5}})

        self.assertEqual(totals, {"3": 2})
        self.assertEqual(resources["pact_magic"]["slot_level"], 3)
        self.assertEqual(resources["pact_magic"]["max"], 2)
        self.assertEqual(resources["pact_magic"]["current"], 1)
        self.assertEqual(resources["pact_magic"]["className"], "Runesmith")
        self.assertTrue(resources["pact_magic"]["homebrew"])


if __name__ == "__main__":
    unittest.main()
