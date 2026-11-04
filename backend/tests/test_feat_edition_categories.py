"""Regression: feat categories must be resolved per edition.

A feat can sit in a different category in each edition, so feats_for_edition
must not concatenate _GENERAL_FEATS_BOTH and _ORIGIN_FEATS_2024 blindly:

  - feats_for_edition('2024', 'general') would offer Origin feats as General
    feats. At a 2024 ASI level only General feats are legal, so the API would
    be handing the builder illegal choices.
  - feats_for_edition('2024', 'all') would return duplicates, so a combined
    picker would show the same feat twice.

The shipped lists carry only SRD-licensed feats: SRD 5.2 (CC-BY-4.0) licenses
four Origin feats and two General feats, and SRD 5.1 licenses Grappler alone.
Everything the PHB adds on top is the table's own homebrew -- see
docs/licensing/SRD_FEATS.md.
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


# The Origin feats SRD 5.2 licenses.
ORIGIN_FEATS_2024 = {
    "Alert",
    "Magic Initiate",
    "Savage Attacker",
    "Skilled",
}

# The General feats both editions offer. Grappler is the one feat SRD 5.1
# licenses, so the 2014 list is deliberately short.
GENERAL_FEATS_BOTH = {
    "Ability Score Improvement",
    "Grappler",
}

# Feats that used to ship but are not SRD-licensed. They now live in the
# private homebrew pack, so re-adding one here is a licensing regression.
UNLICENSED_FEATS = {
    "Lucky",
    "Tough",
    "Healer",
    "Crafter",
    "Musician",
    "Tavern Brawler",
    "War Caster",
    "Athlete",
}


class FeatEditionCategoryTests(unittest.TestCase):
    def test_2024_general_feats_exclude_every_origin_feat(self):
        general = set(feats_for_edition("2024", "general"))
        self.assertEqual(
            general & ORIGIN_FEATS_2024,
            set(),
            "an Origin feat offered at a 2024 ASI level is an illegal choice",
        )

    def test_2024_origin_feats_are_the_srd_origin_feats(self):
        self.assertEqual(set(feats_for_edition("2024", "origin")), ORIGIN_FEATS_2024)

    def test_2014_has_no_origin_category(self):
        self.assertEqual(feats_for_edition("2014", "origin"), [])

    def test_2014_general_feats_are_the_shared_srd_feats(self):
        """These are legal 2014 feats and must not be lost to the 2024 split."""
        self.assertEqual(set(feats_for_edition("2014", "general")), GENERAL_FEATS_BOTH)

    def test_no_unlicensed_feat_is_offered_in_either_edition(self):
        """Re-adding a PHB-only feat to the shipped lists is a licensing bug."""
        for edition in ("2014", "2024"):
            with self.subTest(edition=edition):
                offered = set(feats_for_edition(edition, "all"))
                self.assertEqual(offered & UNLICENSED_FEATS, set())

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
