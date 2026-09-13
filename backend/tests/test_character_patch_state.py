"""Regression tests for lenient character patch inventory state."""

import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "character-patch-state-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.character_patch import (  # noqa: E402
    _clean_create,
    _clean_patch,
    _compute_item_effects,
    _normalise_equipment_list,
    _normalise_equipped_map,
)


class TestCharacterPatchInventoryState(unittest.TestCase):
    def test_equipment_list_accepts_is_equipped_alias_and_quantity_aliases(self):
        items = _normalise_equipment_list([
            {"id": "blade-1", "name": "Longsword", "is_equipped": True, "qty": 2},
        ])

        self.assertEqual(len(items), 1)
        self.assertTrue(items[0]["equipped"])
        self.assertTrue(items[0]["is_equipped"])
        self.assertEqual(items[0]["quantity"], 2)
        self.assertEqual(items[0]["qty"], 2)

    def test_equipped_map_collapses_legacy_slot_aliases_to_one_canonical_slot(self):
        equipped = _normalise_equipped_map({
            "main_hand": {"id": "blade-1", "name": "Longsword", "attack_bonus": 1},
            "weapon": {"id": "blade-1", "name": "Longsword", "attack_bonus": 1},
            "shield": {"id": "shield-1", "name": "Shield", "ac_bonus": 2},
        })

        self.assertEqual(set(equipped), {"mainHand", "offHand"})
        self.assertEqual(equipped["mainHand"]["id"], "blade-1")
        self.assertEqual(equipped["mainHand"]["equip_slot"], "mainHand")
        self.assertEqual(equipped["offHand"]["id"], "shield-1")
        self.assertEqual(equipped["offHand"]["equipped_slot"], "offHand")

    def test_custom_equipment_slots_survive_canonicalisation(self):
        equipped = _normalise_equipped_map({
            "ring_left": {"id": "ring-1", "name": "Ring of Protection", "ac_bonus": 1},
        })

        self.assertIn("ring_left", equipped)
        self.assertEqual(equipped["ring_left"]["name"], "Ring of Protection")
        self.assertTrue(equipped["ring_left"]["equipped"])

    def test_item_effects_do_not_double_count_duplicate_legacy_slot_aliases(self):
        effects = _compute_item_effects({
            "mainHand": {"id": "blade-1", "name": "Magic Blade", "attack_bonus": 1},
            "weapon": {"id": "blade-1", "name": "Magic Blade", "attack_bonus": 1},
            "armor": {"id": "armor-1", "name": "Magic Armor", "ac_bonus": 1},
            "armour": {"id": "armor-1", "name": "Magic Armor", "ac_bonus": 1},
        })

        self.assertEqual(effects["attack_bonus"], 1)
        self.assertEqual(effects["ac_bonus"], 1)

    def test_equipment_only_patch_does_not_overwrite_backpack_inventory(self):
        update = _clean_patch({
            "equipment": [{"id": "starter-1", "name": "Starter Sword"}],
        })

        self.assertIn("equipment", update)
        self.assertNotIn("inventory", update)

    def test_starting_equipment_patch_does_not_cascade_into_other_carried_lists(self):
        update = _clean_patch({
            "starting_equipment": [{"id": "starter-1", "name": "Explorer Pack"}],
        })

        self.assertIn("starting_equipment", update)
        self.assertNotIn("equipment", update)
        self.assertNotIn("inventory", update)

    def test_equipped_patch_is_canonical_and_recomputes_effects(self):
        update = _clean_patch({
            "equipped": {
                "main_hand": {"id": "blade-1", "name": "Magic Blade", "attack_bonus": 2},
                "weapon": {"id": "blade-1", "name": "Magic Blade", "attack_bonus": 2},
            }
        })

        self.assertEqual(set(update["equipped"]), {"mainHand"})
        self.assertEqual(update["item_effects"]["attack_bonus"], 2)

    def test_character_creation_still_falls_back_from_starting_gear_to_carried_inventory(self):
        character = _clean_create({
            "name": "Starter Hero",
            "character_class": "Fighter",
            "starting_equipment": [
                {"id": "sword-1", "name": "Longsword"},
                {"id": "pack-1", "name": "Explorer Pack"},
            ],
        }, "owner")

        self.assertEqual([item["name"] for item in character["equipment"]], ["Longsword", "Explorer Pack"])
        self.assertEqual([item["name"] for item in character["inventory"]], ["Longsword", "Explorer Pack"])


if __name__ == "__main__":
    unittest.main()
