"""End-to-end custom spellcasting progression regression tests."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "custom-caster-progression-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from fastapi import HTTPException  # noqa: E402
from models import LevelUpRequest  # noqa: E402
from routes.character_creation_state import normalise_created_character  # noqa: E402
from routes.character_progression_preflight import build_level_up_preflight  # noqa: E402
from routes.character_progression_state import build_state_safe_level_up_update  # noqa: E402


def snapshot(
    class_name,
    *,
    ability="intelligence",
    casting_type="known",
    progression="full",
    cantrips=None,
    spells=None,
    spellbook=None,
    prepared=None,
):
    return {
        class_name: {
            "class_name": class_name,
            "ability": ability,
            "type": casting_type,
            "progression": progression,
            "start_level": 1,
            "cantrips_level_1": (cantrips or {}).get(1, 0),
            "spells_level_1": (
                (spellbook or {}).get(1, 0)
                if casting_type == "spellbook"
                else (prepared or {}).get(1, 0)
                if casting_type == "prepared"
                else (spells or {}).get(1, 0)
            ),
            "cantrips_known_table": cantrips or {},
            "spells_known_table": spells or {},
            "spellbook_spells_table": spellbook or {},
            "prepared_spells_table": prepared or {},
        }
    }


def custom_character(class_name, level, contract, **overrides):
    base = {
        "id": f"{class_name.lower()}-{level}",
        "user_id": "tester",
        "name": f"Test {class_name}",
        "race": "Human",
        "character_class": class_name,
        "level": level,
        "edition": "2014",
        "rules_edition": "2014",
        "ruleset_id": "dnd5e_2014",
        "class_levels": {class_name: level},
        "classes": [{"name": class_name, "level": level, "subclass": ""}],
        "constitution": 12,
        "intelligence": 16,
        "wisdom": 16,
        "charisma": 16,
        "proficiency_bonus": 2,
        "max_hit_points": 16,
        "current_hit_points": 11,
        "hit_dice_remaining": 1,
        "spell_slots": {},
        "spell_slots_remaining": {},
        "spells_known": [],
        "spells_prepared": [],
        "spellbook": [],
        "cantrips_known": [],
        "resources": {},
        "feats": [],
        "level_progression": {},
        "homebrew_spellcasting": contract,
    }
    base.update(overrides)
    return base


class TestHomebrewSpellcastingProgression(unittest.TestCase):
    def test_creation_keeps_snapshot_and_derives_custom_full_caster_slots(self):
        contract = snapshot(
            "Runesmith",
            cantrips={1: 2, 4: 3},
            spells={1: 2, 2: 3},
        )
        created = normalise_created_character({
            "name": "Ari",
            "race": "Human",
            "character_class": "Runesmith",
            "level": 2,
            "constitution": 12,
            "intelligence": 16,
            "spellcasting_ability": "intelligence",
            "homebrew_spellcasting": contract,
        }, "tester")

        self.assertEqual(created["homebrew_spellcasting"], contract)
        self.assertEqual(created["spell_slots"], {"1": 3})
        self.assertEqual(created["spellcasting_ability"], "intelligence")

    def test_preflight_uses_explicit_custom_known_spell_growth(self):
        contract = snapshot(
            "Runesmith",
            cantrips={1: 2, 2: 3},
            spells={1: 2, 2: 3, 3: 4},
        )
        existing = custom_character(
            "Runesmith",
            1,
            contract,
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 1},
        )

        result = build_level_up_preflight(existing, target_class="Runesmith")

        self.assertEqual(result["spell_selection_mode"], "known")
        self.assertEqual(result["cantrips_to_learn"], 1)
        self.assertEqual(result["spells_to_learn"], 1)
        self.assertEqual(result["previous_spell_slots"], {"1": 2})
        self.assertEqual(result["spell_slots"], {"1": 3})
        self.assertEqual(result["progression_reference"]["source"], "homebrew-character-snapshot")

    def test_preflight_does_not_invent_growth_when_author_omits_later_counts(self):
        contract = snapshot(
            "Runesmith",
            cantrips={1: 2},
            spells={1: 2},
        )
        existing = custom_character("Runesmith", 1, contract, spell_slots={"1": 2})

        result = build_level_up_preflight(existing, target_class="Runesmith")

        self.assertEqual(result["cantrips_to_learn"], 0)
        self.assertEqual(result["spells_to_learn"], 0)
        self.assertEqual(result["spell_slots"], {"1": 3})

    def test_half_and_third_custom_casters_use_server_slot_math(self):
        half_contract = snapshot(
            "Warden",
            ability="wisdom",
            progression="half",
            spells={1: 0, 2: 1, 3: 2},
        )
        half = custom_character(
            "Warden",
            2,
            half_contract,
            edition="2024",
            rules_edition="2024",
            ruleset_id="dnd5e_2024",
        )
        half_result = build_level_up_preflight(half, target_class="Warden")
        self.assertEqual(half_result["previous_spell_slots"], {"1": 2})
        self.assertEqual(half_result["spell_slots"], {"1": 3})

        third_contract = snapshot(
            "Rune Knight",
            progression="third",
            spells={3: 1, 6: 2},
        )
        third = custom_character("Rune Knight", 5, third_contract)
        third_result = build_level_up_preflight(third, target_class="Rune Knight")
        self.assertEqual(third_result["previous_spell_slots"], {"1": 2})
        self.assertEqual(third_result["spell_slots"], {"1": 3})

    def test_level_up_rejects_missing_author_required_custom_spell_choice(self):
        contract = snapshot("Runesmith", spells={1: 2, 2: 3})
        existing = custom_character(
            "Runesmith",
            1,
            contract,
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 2},
        )
        request = LevelUpRequest(
            new_level=2,
            new_class="Runesmith",
            hp_method="average",
            new_spells=[],
        )

        with self.assertRaises(HTTPException) as raised:
            build_state_safe_level_up_update(existing, request, "Runesmith", "standard")

        self.assertIn("requires exactly 1 new spell", raised.exception.detail)

    def test_known_caster_level_up_routes_spells_and_preserves_spent_slots(self):
        contract = snapshot(
            "Runesmith",
            spells={1: 2, 2: 3},
        )
        existing = custom_character(
            "Runesmith",
            1,
            contract,
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 0},
            spells_known=[{"name": "Rune Spark", "level": 1, "sourceClass": "Runesmith"}],
        )
        request = LevelUpRequest(
            new_level=2,
            new_class="Runesmith",
            hp_method="average",
            new_spells=[{"name": "Glyph Dart", "level": 1}],
        )

        update = build_state_safe_level_up_update(existing, request, "Runesmith", "standard")

        self.assertEqual(update["spell_slots"], {"1": 3})
        self.assertEqual(update["spell_slots_remaining"], {"1": 1})
        self.assertEqual([spell["name"] for spell in update["spells_known"]], ["Rune Spark", "Glyph Dart"])
        self.assertEqual(update["spells_known"][-1]["sourceClass"], "Runesmith")
        self.assertEqual(update["level_progression"]["2"]["spell_selection_mode"], "known")
        self.assertEqual(update["spell_save_dc"], 13)
        self.assertEqual(update["spell_attack_bonus"], 5)

    def test_spellbook_caster_routes_author_defined_growth_to_spellbook(self):
        contract = snapshot(
            "Arcwright",
            casting_type="spellbook",
            spellbook={1: 6, 2: 8},
        )
        existing = custom_character(
            "Arcwright",
            1,
            contract,
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 2},
            spellbook=[{"name": "Ward Mark", "level": 1}],
        )
        request = LevelUpRequest(
            new_level=2,
            new_class="Arcwright",
            hp_method="average",
            new_spells=[
                {"name": "Ink Shield", "level": 1},
                {"name": "Sigil Step", "level": 1},
            ],
        )

        update = build_state_safe_level_up_update(existing, request, "Arcwright", "standard")

        self.assertEqual(
            [spell["name"] for spell in update["spellbook"]],
            ["Ward Mark", "Ink Shield", "Sigil Step"],
        )
        self.assertNotIn("spells_known", update)
        self.assertEqual(update["level_progression"]["2"]["spell_destination"], "spellbook")

    def test_prepared_caster_uses_author_capacity_and_rejects_unconfigured_replacements(self):
        contract = snapshot(
            "Spirit Warden",
            ability="wisdom",
            casting_type="prepared",
            prepared={1: 2, 2: 3},
        )
        existing = custom_character(
            "Spirit Warden",
            1,
            contract,
            wisdom=16,
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 1},
            spells_prepared=[
                {"name": "Guiding Thread", "level": 1},
                {"name": "Quiet Ward", "level": 1},
            ],
        )

        preflight = build_level_up_preflight(existing, target_class="Spirit Warden")
        self.assertEqual(preflight["spell_selection_mode"], "prepared")
        self.assertEqual(preflight["spells_to_learn"], 0)
        self.assertEqual(preflight["prepared_spell_capacity_before"], 2)
        self.assertEqual(preflight["prepared_spell_capacity"], 3)
        self.assertEqual(preflight["prepared_spell_capacity_gain"], 1)
        self.assertEqual(preflight["prepared_spell_change"], {"cadence": "none", "max_replacements": 0})

        request = LevelUpRequest(
            new_level=2,
            new_class="Spirit Warden",
            hp_method="average",
            new_spells=[{"name": "Ancestor's Light", "level": 1}],
        )
        update = build_state_safe_level_up_update(existing, request, "Spirit Warden", "standard")
        self.assertEqual(len(update["spells_prepared"]), 3)
        self.assertEqual(update["spells_prepared"][-1]["sourceClass"], "Spirit Warden")

        replacement = LevelUpRequest(
            new_level=2,
            new_class="Spirit Warden",
            hp_method="average",
            new_spells=[{"name": "Ancestor's Light", "level": 1, "replaces": "Quiet Ward"}],
        )
        with self.assertRaises(HTTPException) as raised:
            build_state_safe_level_up_update(existing, replacement, "Spirit Warden", "standard")
        self.assertIn("cannot replace prepared spells", raised.exception.detail)

    def test_custom_pact_caster_scales_pool_without_refilling_spent_uses(self):
        contract = snapshot(
            "Hexbinder",
            ability="charisma",
            progression="pact",
            spells={1: 2, 11: 3},
        )
        existing = custom_character(
            "Hexbinder",
            10,
            contract,
            charisma=18,
            proficiency_bonus=4,
            spell_slots={"5": 2},
            spell_slots_remaining={"5": 0},
            resources={
                "pact_magic": {
                    "label": "Pact Magic",
                    "current": 0,
                    "remaining": 0,
                    "max": 2,
                    "slot_level": 5,
                    "restore": "short-rest",
                    "className": "Hexbinder",
                    "homebrew": True,
                }
            },
        )
        request = LevelUpRequest(
            new_level=11,
            new_class="Hexbinder",
            hp_method="average",
            new_spells=[{"name": "Binding Star", "level": 5}],
        )

        update = build_state_safe_level_up_update(existing, request, "Hexbinder", "standard")

        self.assertEqual(update["spell_slots"], {"5": 3})
        self.assertEqual(update["spell_slots_remaining"], {"5": 1})
        self.assertEqual(update["resources"]["pact_magic"]["max"], 3)
        self.assertEqual(update["resources"]["pact_magic"]["current"], 1)
        self.assertEqual(update["resources"]["pact_magic"]["className"], "Hexbinder")
        self.assertTrue(update["resources"]["pact_magic"]["homebrew"])


if __name__ == "__main__":
    unittest.main()
