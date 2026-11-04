"""Regression: the campaign roster must not be readable by outsiders.

GET /campaigns/{campaign_id}/members read the campaign straight out of the
database with no membership check, so the member list, the GM's name and the
live online-user list were readable for any campaign id by any signed-in
account.

The same handler also had two lookups against the wrong field:

  db.users.find_one({"email": username})      # username, not an email
  db.users.find_one({"_id": dm_user_id})      # dm_user_id holds a username

get_current_user returns a username (the JWT subject), and registration
stores username and email as separate fields. So the first lookup 404'd for
anyone whose username is not also their email address, and the second always
missed, leaving the GM reported as "Unknown".
"""

import ast
import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "campaign-members-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

ROUTES = BACKEND_DIR / "routes" / "campaigns.py"
SOURCE = ROUTES.read_text()


def route_function(name):
    for node in ast.walk(ast.parse(SOURCE)):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    raise AssertionError(f"{name} not found in routes/campaigns.py")


def called_names(node):
    return {
        inner.func.id
        for inner in ast.walk(node)
        if isinstance(inner, ast.Call) and isinstance(inner.func, ast.Name)
    }


class CampaignMembersAuthorizationTests(unittest.TestCase):
    def test_the_roster_route_requires_membership(self):
        self.assertIn("verify_campaign_membership", called_names(route_function("get_campaign_members")))

    def test_the_roster_route_does_not_read_the_campaign_unchecked(self):
        """An unfiltered find_one is how the check was missing in the first place."""
        segment = ast.get_source_segment(SOURCE, route_function("get_campaign_members")) or ""
        self.assertNotIn("db.campaigns.find_one", segment)

    def test_the_roster_route_no_longer_looks_a_user_up_by_email(self):
        segment = ast.get_source_segment(SOURCE, route_function("get_campaign_members")) or ""
        self.assertNotIn('{"email": username}', segment)

    def test_the_gm_is_matched_on_username_not_mongo_id(self):
        segment = ast.get_source_segment(SOURCE, route_function("get_campaign_members")) or ""
        self.assertNotIn('{"_id": campaign.get("dm_user_id")}', segment)
        self.assertIn('"username": dm_user_id', segment)

    def test_the_gm_name_falls_back_to_the_username_rather_than_unknown(self):
        """dm_user_id is itself a username, so it is a better fallback."""
        segment = ast.get_source_segment(SOURCE, route_function("get_campaign_members")) or ""
        self.assertIn("or dm_user_id", segment)

    def test_member_documents_are_projected_without_the_mongo_id(self):
        segment = ast.get_source_segment(SOURCE, route_function("get_campaign_members")) or ""
        self.assertIn('{"_id": 0}', segment)


class EveryCampaignIdRouteIsAuthorizedTests(unittest.TestCase):
    """A sweep, so a new route cannot quietly reappear without a check."""

    AUTHORIZATION_MARKERS = (
        "verify_campaign_membership",
        "verify_campaign_ownership",
        "dm_user_id",
        "campaign_members",
        "require_admin",
        "is_admin",
    )

    def test_no_route_reads_a_campaign_by_id_without_authorizing(self):
        unguarded = []
        tree = ast.parse(SOURCE)
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            decorators = [ast.get_source_segment(SOURCE, d) or "" for d in node.decorator_list]
            if not any("router." in d for d in decorators):
                continue
            segment = ast.get_source_segment(SOURCE, node) or ""
            if "campaigns.find_one" not in segment:
                continue
            if not any(marker in segment for marker in self.AUTHORIZATION_MARKERS):
                unguarded.append(f"{node.name} (line {node.lineno})")

        self.assertEqual(
            unguarded,
            [],
            f"these campaign routes read a campaign without authorizing: {unguarded}",
        )


if __name__ == "__main__":
    unittest.main()
