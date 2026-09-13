"""Regression tests for edition-aware spell-list persistence during level-up."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-spell-progression-state-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from fastapi import HTTPException  # noqa: E402
from models import LevelUpRequest  # noqa: E402
from routes.character_progression_state import build_state_safe_level_up_update  # noqa: E402


def caster_character(class_name, level, edition="2014", **overrides):
    base = {
        "character_class": class_name,
        "level": level,
        "edition": edition,
        "rules_edition": edition,
        "ruleset_id": f"dnd5e_{edition}",
        "class_levels": {class_name: level},
        "classes": [{"name": class_name, "level": level, "subclass": overrides.get("subclass", "")}],
        "constitution": 12,
        "max_hit_points": 16,
        "current_hit_points": 11,
        "hit_dice_remaining": 1,
        "spell_slots": {},
        "spell_slots_remaining": {},
        "resources": {},
        "feats": [],
        "level_progression": {},
    }
    base.update(overrides)
    return base


class TestCharacterSpellProgressionState(unittest.TestCase):
    def test_2014_wizard_level_up_additions_go_to_spellbook(self):
        existing = caster_character(
            "Wizard",
            2,
            "2014",
            intelligence=16,
            spellbook=[{"name": "Shield", "level": 1}],
            spells_known=[{"name": "Legacy Wizard Entry", "level": 1}],
            spell_slots={"1": 3},
            spell_slots_remaining={"1": 1},
        )
        request = LevelUpRequest(
            new_level=3,
            new_class="Wizard",
            hp_method="average",
            new_spells=[
                {"name": "Misty Step", "level": 2, "school": "Conjuration"},
                {"name": "Scorching Ray", "level": 2, "school": "Evocation"},
            ],
        )

        update = build_state_safe_level_up_update(existing, request, "Wizard", "standard")

        self.assertEqual([spell["name"] for spell in update["spellbook"]], ["Shield", "Misty Step", "Scorching Ray"])
        self.assertEqual(update["spellbook"][-1]["sourceClass"], "Wizard")
        self.assertNotIn("spells_known", update)
        self.assertEqual(update["level_progression"]["3"]["spell_selection_mode"], "spellbook")
        self.assertEqual(update["level_progression"]["3"]["spell_destination"], "spellbook")

    def test_2024_bard_level_up_choices_extend_prepared_list_not_known_list(self):
        existing = caster_character(
            "Bard",
            4,
            "2024",
            charisma=16,
            spells_prepared=[{"name": "Healing Word", "level": 1}],
            spells_known=[{"name": "Legacy Known Entry", "level": 1}],
            spell_slots={"1": 4, "2": 3},
            spell_slots_remaining={"1": 2, "2": 1},
        )
        request = LevelUpRequest(
            new_level=5,
            new_class="Bard",
            hp_method="average",
            new_spells=[
                {"name": "Hypnotic Pattern", "level": 3, "school": "Illusion"},
                {"name": "Dispel Magic", "level": 3, "school": "Abjuration"},
            ],
        )

        update = build_state_safe_level_up_update(existing, request, "Bard", "standard")

        self.assertEqual(
            [spell["name"] for spell in update["spells_prepared"]],
            ["Healing Word", "Hypnotic Pattern", "Dispel Magic"],
        )
        self.assertEqual(update["spells_prepared"][-1]["sourceClass"], "Bard")
        self.assertNotIn("spells_known", update)
        self.assertEqual(update["level_progression"]["5"]["spell_selection_mode"], "prepared")
        self.assertEqual(update["level_progression"]["5"]["spell_destination"], "spells_prepared")
        self.assertEqual(update["level_progression"]["5"]["prepared_capacity_before"], 7)
        self.assertEqual(update["level_progression"]["5"]["prepared_capacity_after"], 9)

    def test_2014_bard_level_up_choices_remain_known_spells(self):
        existing = caster_character(
            "Bard",
            1,
            "2014",
            charisma=16,
            spells_known=[{"name": "Healing Word", "level": 1}],
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 1},
        )
        request = LevelUpRequest(
            new_level=2,
            new_class="Bard",
            hp_method="average",
            new_spells=[{"name": "Dissonant Whispers", "level": 1, "school": "Enchantment"}],
        )

        update = build_state_safe_level_up_update(existing, request, "Bard", "standard")

        self.assertEqual([spell["name"] for spell in update["spells_known"]], ["Healing Word", "Dissonant Whispers"])
        self.assertEqual(update["spells_known"][-1]["sourceClass"], "Bard")
        self.assertNotIn("spells_prepared", update)
        self.assertEqual(update["level_progression"]["2"]["spell_selection_mode"], "known")
        self.assertEqual(update["level_progression"]["2"]["spell_destination"], "spells_known")

    def test_spell_destination_deduplicates_existing_prepared_spell(self):
        existing = caster_character(
            "Sorcerer",
            1,
            "2024",
            charisma=16,
            spells_prepared=[{"name": "Shield", "level": 1}],
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 2},
        )
        request = LevelUpRequest(
            new_level=2,
            new_class="Sorcerer",
            hp_method="average",
            new_spells=[
                {"name": "Shield", "level": 1},
                {"name": "Magic Missile", "level": 1},
            ],
        )

        update = build_state_safe_level_up_update(existing, request, "Sorcerer", "standard")

        self.assertEqual([spell["name"] for spell in update["spells_prepared"]], ["Shield", "Magic Missile"])
        self.assertNotIn("spells_known", update)

    def test_2024_bard_can_replace_one_prepared_spell_and_fill_new_capacity(self):
        current = [
            {"name": "Healing Word", "level": 1},
            {"name": "Dissonant Whispers", "level": 1},
            {"name": "Faerie Fire", "level": 1},
            {"name": "Shatter", "level": 2},
            {"name": "Suggestion", "level": 2},
            {"name": "Invisibility", "level": 2},
            {"name": "Heat Metal", "level": 2},
        ]
        existing = caster_character(
            "Bard",
            4,
            "2024",
            charisma=18,
            spells_prepared=current,
            spell_slots={"1": 4, "2": 3},
            spell_slots_remaining={"1": 3, "2": 2},
        )
        request = LevelUpRequest(
            new_level=5,
            new_class="Bard",
            hp_method="average",
            new_spells=[
                {"name": "Silence", "level": 2, "replaces": "Heat Metal"},
                {"name": "Hypnotic Pattern", "level": 3},
                {"name": "Dispel Magic", "level": 3},
            ],
        )

        update = build_state_safe_level_up_update(existing, request, "Bard", "standard")
        names = [spell["name"] for spell in update["spells_prepared"]]

        self.assertEqual(len(names), 9)
        self.assertNotIn("Heat Metal", names)
        self.assertIn("Silence", names)
        self.assertIn("Hypnotic Pattern", names)
        self.assertIn("Dispel Magic", names)
        self.assertEqual(
            update["level_progression"]["5"]["prepared_replacements"],
            [{"from": "Heat Metal", "to": "Silence"}],
        )

    def test_2024_bard_rejects_more_than_one_level_up_replacement(self):
        existing = caster_character(
            "Bard",
            4,
            "2024",
            charisma=18,
            spells_prepared=[
                {"name": "Healing Word", "level": 1},
                {"name": "Dissonant Whispers", "level": 1},
            ],
        )
        request = LevelUpRequest(
            new_level=5,
            new_class="Bard",
            hp_method="average",
            new_spells=[
                {"name": "Silence", "level": 2, "replaces": "Healing Word"},
                {"name": "Suggestion", "level": 2, "replaces": "Dissonant Whispers"},
            ],
        )

        with self.assertRaises(HTTPException) as raised:
            build_state_safe_level_up_update(existing, request, "Bard", "standard")

        self.assertEqual(raised.exception.status_code, 400)
        self.assertIn("at most 1", raised.exception.detail)

    def test_2024_prepared_caster_uses_legacy_known_list_as_non_destructive_migration_seed(self):
        existing = caster_character(
            "Warlock",
            2,
            "2024",
            charisma=16,
            spells_prepared=[],
            spells_known=[
                {"name": "Hex", "level": 1},
                {"name": "Armor of Agathys", "level": 1},
                {"name": "Hellish Rebuke", "level": 1},
            ],
            resources={"pact_magic": {"current": 1, "remaining": 1, "max": 2, "slot_level": 1}},
            spell_slots={"1": 2},
            spell_slots_remaining={"1": 1},
        )
        request = LevelUpRequest(
            new_level=3,
            new_class="Warlock",
            hp_method="average",
            new_spells=[{"name": "Misty Step", "level": 2}],
        )

        update = build_state_safe_level_up_update(existing, request, "Warlock", "standard")
        names = [spell["name"] for spell in update["spells_prepared"]]

        self.assertEqual(names, ["Hex", "Armor of Agathys", "Hellish Rebuke", "Misty Step"])
        self.assertTrue(update["level_progression"]["3"]["legacy_spell_list_migrated"])
        self.assertNotIn("spells_known", update)

    def test_2024_cleric_rejects_level_up_replacement_marker(self):
        existing = caster_character(
            "Cleric",
            2,
            "2024",
            wisdom=16,
            spells_prepared=[{"name": "Bless", "level": 1}],
        )
        request = LevelUpRequest(
            new_level=3,
            new_class="Cleric",
            hp_method="average",
            new_spells=[{"name": "Aid", "level": 2, "replaces": "Bless"}],
        )

        with self.assertRaises(HTTPException) as raised:
            build_state_safe_level_up_update(existing, request, "Cleric", "standard")

        self.assertEqual(raised.exception.status_code, 400)
        self.assertIn("cannot replace prepared spells during level-up", raised.exception.detail)


if __name__ == "__main__":
    unittest.main()
