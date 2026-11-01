"""Regressions for mass assignment on the two ruleset update routes.

PUT /rule-systems/{id} and PUT /rulesets/{id} both took an untrusted
Dict[str, Any] from the client and splatted it straight into a Mongo $set.
Ownership was checked, but nothing constrained *which* fields the owner could
write, so an owner could rewrite server-owned fields on their own document:

  - `is_official`: the list route returns every system with is_official=True
    to all users, so setting it publishes a private system platform-wide --
    and the update guard then refuses all further edits, locking the owner
    out of their own system permanently.
  - `owner_id`: hands the document to someone else, or orphans it.
  - `id`: changes the document's identity, which can shadow another system
    (including an official one) behind a duplicate id.

Both routes now filter the payload through an explicit allowlist.
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
# never open a connection, so safe local values are sufficient here.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "ruleset-mass-assignment-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from fastapi import HTTPException  # noqa: E402

from models import CustomRuleset, RuleSystem  # noqa: E402
from routes.rule_systems import (  # noqa: E402
    CUSTOM_RULESET_EDITABLE_FIELDS,
    RULE_SYSTEM_EDITABLE_FIELDS,
    _editable_update,
)


PROTECTED_FIELDS = ("id", "owner_id", "is_official", "created_at", "updated_at")


class EditableUpdateFilterTests(unittest.TestCase):
    def test_server_owned_fields_are_dropped(self):
        payload = {
            "name": "My Homebrew",
            "is_official": True,
            "owner_id": "someone-else",
            "id": "dnd5e_2014",
            "created_at": "1999-01-01T00:00:00+00:00",
        }
        self.assertEqual(
            _editable_update(payload, RULE_SYSTEM_EDITABLE_FIELDS),
            {"name": "My Homebrew"},
        )

    def test_legitimate_edits_still_pass_through_unchanged(self):
        payload = {
            "name": "Ledger d20",
            "description": "House rules",
            "max_level": 30,
            "has_spells": False,
            "skills": [{"name": "Lore", "ability": "Intelligence"}],
        }
        self.assertEqual(_editable_update(payload, RULE_SYSTEM_EDITABLE_FIELDS), payload)

    def test_falsey_values_are_preserved_not_treated_as_absent(self):
        """A filter written with `if value` would silently drop these."""
        payload = {"description": "", "has_races": False, "max_level": 0}
        self.assertEqual(_editable_update(payload, RULE_SYSTEM_EDITABLE_FIELDS), payload)

    def test_non_object_payload_is_rejected(self):
        for bad in ([], "name=x", 7, None):
            with self.subTest(payload=bad):
                with self.assertRaises(HTTPException) as caught:
                    _editable_update(bad, RULE_SYSTEM_EDITABLE_FIELDS)
                self.assertEqual(caught.exception.status_code, 400)

    def test_neither_allowlist_contains_a_protected_field(self):
        for allowed in (RULE_SYSTEM_EDITABLE_FIELDS, CUSTOM_RULESET_EDITABLE_FIELDS):
            for field in PROTECTED_FIELDS:
                with self.subTest(field=field):
                    self.assertNotIn(field, allowed)

    def test_ruleset_allowlist_excludes_the_share_managed_fields(self):
        """Sharing has its own validated route; it must not be writable here."""
        self.assertNotIn("shared_with", CUSTOM_RULESET_EDITABLE_FIELDS)
        self.assertNotIn("shared_campaigns", CUSTOM_RULESET_EDITABLE_FIELDS)

    def test_every_allowlisted_field_exists_on_its_model(self):
        """A typo in an allowlist would silently stop that field saving."""
        self.assertLessEqual(
            RULE_SYSTEM_EDITABLE_FIELDS, set(RuleSystem.model_fields)
        )
        self.assertLessEqual(
            CUSTOM_RULESET_EDITABLE_FIELDS, set(CustomRuleset.model_fields)
        )


class UpdateRoutesUseTheFilterTests(unittest.TestCase):
    """The filter is worthless if a route stops calling it."""

    SOURCE = (BACKEND_DIR / "routes" / "rule_systems.py").read_text()

    CASES = {
        "update_rule_system": ("update_data", "RULE_SYSTEM_EDITABLE_FIELDS"),
        "update_ruleset": ("updates", "CUSTOM_RULESET_EDITABLE_FIELDS"),
    }

    def _function(self, name):
        for node in ast.walk(ast.parse(self.SOURCE)):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
                return node
        self.fail(f"{name} not found in routes/rule_systems.py")

    def test_each_route_filters_with_its_own_allowlist(self):
        for function_name, (_payload_arg, allowlist) in self.CASES.items():
            with self.subTest(route=function_name):
                node = self._function(function_name)
                names = {
                    inner.id for inner in ast.walk(node) if isinstance(inner, ast.Name)
                }
                self.assertIn("_editable_update", names)
                self.assertIn(allowlist, names)

    def test_no_route_writes_the_raw_client_payload(self):
        """The actual bug: the request body reaching $set unfiltered."""
        for function_name, (payload_arg, _allowlist) in self.CASES.items():
            with self.subTest(route=function_name):
                node = self._function(function_name)
                for call in ast.walk(node):
                    if not isinstance(call, ast.Call):
                        continue
                    for arg in call.args:
                        if not isinstance(arg, ast.Dict):
                            continue
                        for key, value in zip(arg.keys, arg.values):
                            is_set = isinstance(key, ast.Constant) and key.value == "$set"
                            if is_set and isinstance(value, ast.Name):
                                self.assertNotEqual(
                                    value.id,
                                    payload_arg,
                                    f"{function_name} passes the raw request body to $set",
                                )


if __name__ == "__main__":
    unittest.main()
