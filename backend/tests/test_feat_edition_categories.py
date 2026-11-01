"""Regression: feat categories must be resolved per edition.

Six feats -- Alert, Lucky, Magic Initiate, Savage Attacker, Tavern Brawler
and Tough -- are General feats in the 2014 rules but Origin feats in 2024, so
they sit in both _GENERAL_FEATS_BOTH and _ORIGIN_FEATS_2024.

feats_for_edition used to concatenate those lists blindly, which meant:

  - feats_for_edition('2024', 'general') offered all six as General feats.
    At a 2024 ASI level only General feats are legal, so the API was handing
    the builder illegal choices.
  - feats_for_edition('2024', 'all') returned 55 entries of which only 49
    were distinct, so a combined picker showed six feats twice.
"""

import os
import sys
import unittest
from collections import Counter
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# config.py deliberately fails fast without runtime configuration. These tests
# only read static rules data, so safe local values are sufficient here.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "feat-edition-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from data.class_progression import feats_for_edition  # noqa: E402


# The ten Origin feats in the 2024 rules.
ORIGIN_FEATS_2024 = {
    "Alert",
    "Crafter",
    "Healer",
    "Lucky",
    "Magic Initiate",
    "Musician",
    "Savage Attacker",
    "Skilled",
    "Tavern Brawler",
    "Tough",
}


class FeatEditionCategoryTests(unittest.TestCase):
    def test_2024_general_feats_exclude_every_origin_feat(self):
        general = set(feats_for_edition("2024", "general"))
        self.assertEqual(
            general & ORIGIN_FEATS_2024,
            set(),
            "an Origin feat offered at a 2024 ASI level is an illegal choice",
        )

    def test_2024_origin_feats_are_the_ten_origin_feats(self):
        self.assertEqual(set(feats_for_edition("2024", "origin")), ORIGIN_FEATS_2024)

    def test_2014_has_no_origin_category(self):
        self.assertEqual(feats_for_edition("2014", "origin"), [])

    def test_2014_general_feats_still_include_the_shared_feats(self):
        """These are legal 2014 feats and must not be lost to the 2024 split."""
        general = set(feats_for_edition("2014", "general"))
        for feat in ("Alert", "Lucky", "Magic Initiate", "Savage Attacker", "Tavern Brawler", "Tough"):
            with self.subTest(feat=feat):
                self.assertIn(feat, general)

    def test_no_category_returns_duplicates(self):
        for edition in ("2014", "2024"):
            for category in ("origin", "general", "all"):
                with self.subTest(edition=edition, category=category):
                    feats = feats_for_edition(edition, category)
                    repeats = [name for name, count in Counter(feats).items() if count > 1]
                    self.assertEqual(repeats, [])

    def test_all_is_exactly_general_plus_origin(self):
        for edition in ("2014", "2024"):
            with self.subTest(edition=edition):
                combined = set(feats_for_edition(edition, "general")) | set(
                    feats_for_edition(edition, "origin")
                )
                self.assertEqual(set(feats_for_edition(edition, "all")), combined)

    def test_general_and_origin_never_overlap(self):
        for edition in ("2014", "2024"):
            with self.subTest(edition=edition):
                self.assertEqual(
                    set(feats_for_edition(edition, "general"))
                    & set(feats_for_edition(edition, "origin")),
                    set(),
                )

    def test_unknown_edition_is_treated_as_2014(self):
        """_edition() normalises anything that is not 2024; keep that contract."""
        self.assertEqual(
            feats_for_edition("", "general"), feats_for_edition("2014", "general")
        )
        self.assertEqual(feats_for_edition("nonsense", "origin"), [])

    def test_the_returned_lists_are_copies(self):
        """A caller mutating a result must not corrupt the module's data."""
        first = feats_for_edition("2024", "origin")
        first.append("Not A Feat")
        self.assertNotIn("Not A Feat", feats_for_edition("2024", "origin"))


if __name__ == "__main__":
    unittest.main()
