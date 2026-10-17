"""Regression checks for add-only campaign update generation."""
import unittest
from build_campaign_update import make_delta, changed_records, EMPTY
import json


def workspace(**changes):
    result = json.loads(json.dumps(EMPTY))
    result.update(changes)
    return result


class CampaignUpdateTests(unittest.TestCase):
    def test_delta_omits_unchanged_records_and_retains_new_or_edited(self):
        old = workspace(campaigns=[
            {"id": "a", "name": "Old"},
            {"id": "stable", "name": "Unchanged"},
            {"id": "removed", "name": "Should not delete from laptop"},
        ])
        new = workspace(campaigns=[
            {"id": "a", "name": "New"},
            {"id": "stable", "name": "Unchanged"},
            {"id": "added", "name": "New campaign"},
        ])
        delta = make_delta(old, new)
        self.assertEqual([c["id"] for c in delta["campaigns"]], ["a", "added"])

    def test_delta_limits_collections_to_changed_reference_rows(self):
        old = workspace(collections={"a": {
            "handouts": [{"id": "map", "title": "Map v1"}, {"id": "unchanged", "title": "Same"}],
            "npcs": [{"id": "captain", "name": "Captain"}],
        }})
        new = workspace(collections={"a": {
            "handouts": [{"id": "map", "title": "Map v2"}, {"id": "unchanged", "title": "Same"}],
            "npcs": [{"id": "captain", "name": "Captain"}],
        }})
        delta = make_delta(old, new)
        self.assertEqual(delta["collections"]["a"], {
            "handouts": [{"id": "map", "title": "Map v2"}]
        })

    def test_updates_require_stable_record_ids(self):
        with self.assertRaisesRegex(ValueError, "stable id"):
            changed_records([], [{"title": "Without ID"}])

    def test_empty_delta_does_not_contain_deletions(self):
        old = workspace(campaigns=[{"id": "a"}])
        new = workspace()
        delta = make_delta(old, new)
        self.assertEqual(delta["campaigns"], [])


if __name__ == "__main__":
    unittest.main()
