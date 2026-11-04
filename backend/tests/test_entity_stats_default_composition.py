"""Regression: saving an entity whose draft carries no stat block.

NPC.stats and Player.stats are non-optional with a default_factory, but
NPCCreate.stats and PlayerCreate.stats are Optional and default to None. So
the natural composition the save routes use --

    model = NPC(campaign_id=campaign_id, **payload.model_dump())

-- passes stats=None explicitly, the default_factory never applies, and
construction raises. That made POST /rook/draft/save return a raw-pydantic
422 ("Draft could not be saved: 1 validation error for NPC") whenever a Rook
NPC draft had no stat block, which is the expected case: AGENTS.md requires
that Rook not invent creature statistics, and _require_saveable only ever
demanded a name.

routes/npcs.py and routes/players.py each worked around it with their own
`if stats is None` fix-up. The coercion now lives on the models, so a call
site cannot forget it.
"""

import ast
import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# config.py deliberately fails fast without runtime configuration. These tests
# only build models, so safe local values are sufficient here.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "entity-stats-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from models import (  # noqa: E402
    NPC,
    NPCCreate,
    NPCStats,
    Player,
    PlayerCreate,
    PlayerStats,
)


class DraftSaveCompositionTests(unittest.TestCase):
    """The exact composition POST /rook/draft/save performs."""

    CASES = (
        ("NPC", NPC, NPCCreate, NPCStats),
        ("Player", Player, PlayerCreate, PlayerStats),
    )

    def test_entity_composes_from_a_create_payload_with_no_stats(self):
        for label, model, create_model, stats_model in self.CASES:
            with self.subTest(entity=label):
                payload = create_model(name="Lucian Grey")
                self.assertIsNone(payload.stats, "Create model should still allow no stats")

                saved = model(campaign_id="eldritch-heralds", **payload.model_dump())

                # The point of the non-optional field: readers never see None.
                self.assertIsInstance(saved.stats, stats_model)
                self.assertEqual(saved.stats.strength, 10)

    def test_explicit_stats_are_never_overwritten_by_the_default(self):
        for label, model, _create_model, _stats_model in self.CASES:
            with self.subTest(entity=label):
                saved = model(
                    campaign_id="eldritch-heralds",
                    name="Lucian Grey",
                    stats={"strength": 18, "charisma": 16},
                )
                self.assertEqual(saved.stats.strength, 18)
                self.assertEqual(saved.stats.charisma, 16)
                self.assertEqual(saved.stats.dexterity, 10)

    def test_a_stat_block_survives_a_save_and_reload_round_trip(self):
        for label, model, _create_model, _stats_model in self.CASES:
            with self.subTest(entity=label):
                saved = model(
                    campaign_id="eldritch-heralds",
                    name="Lucian Grey",
                    stats={"wisdom": 14},
                )
                reloaded = model.model_validate(saved.model_dump())
                self.assertEqual(reloaded.stats.wisdom, 14)

    def test_an_explicit_none_from_a_stored_document_still_loads(self):
        """Documents written before the fix-up existed may hold stats: null."""
        for label, model, _create_model, stats_model in self.CASES:
            with self.subTest(entity=label):
                reloaded = model.model_validate(
                    {"campaign_id": "eldritch-heralds", "name": "Lucian Grey", "stats": None}
                )
                self.assertIsInstance(reloaded.stats, stats_model)


class SaveRoutesNoLongerNeedTheirOwnFixUpTests(unittest.TestCase):
    """Guard the call site that never had a fix-up in the first place."""

    def test_rook_draft_save_composes_npc_without_a_stats_fix_up(self):
        source = (BACKEND_DIR / "routes" / "rook_studio.py").read_text()
        tree = ast.parse(source)

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "save_rook_draft":
                composes = any(
                    isinstance(inner, ast.Call)
                    and isinstance(inner.func, ast.Name)
                    and inner.func.id == "NPC"
                    for inner in ast.walk(node)
                )
                self.assertTrue(
                    composes,
                    "save_rook_draft no longer builds an NPC; this guard needs updating",
                )
                return

        self.fail("save_rook_draft not found in routes/rook_studio.py")


if __name__ == "__main__":
    unittest.main()
