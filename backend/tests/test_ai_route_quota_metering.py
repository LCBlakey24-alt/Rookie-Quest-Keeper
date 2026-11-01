"""Regressions for AI-route authorisation and monthly-quota metering.

Every route that spends an LLM call must check the caller's monthly AI
allowance before spending it and record the usage after a successful call.
Without this an authenticated user can run the paid provider account dry no
matter what AI_MONTHLY_LIMIT is set to.

The homebrew routes are covered functionally because all three of them
(parse-docx, parse-text, complete-draft) share one helper, so the real
behaviour can be exercised directly. The remaining routes talk to a provider
SDK and a live database, so they are covered structurally: the assertions
below fail if the quota calls are ever dropped from them again.
"""

import asyncio
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
os.environ.setdefault("JWT_SECRET_KEY", "ai-quota-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from fastapi import HTTPException  # noqa: E402

from routes import homebrew  # noqa: E402


class _FakeChat:
    """Minimal stand-in for utils.llm_provider.LlmChat."""

    sent = 0

    def __init__(self, *args, **kwargs):
        pass

    def with_model(self, *args, **kwargs):
        return self

    async def send_message(self, _message):
        type(self).sent += 1
        return '{"name": "Ember Brand"}'


class HomebrewQuotaTests(unittest.TestCase):
    """_llm_json is the single chokepoint for all three homebrew LLM routes."""

    def setUp(self):
        self.recorded = []
        _FakeChat.sent = 0

        self._originals = {
            name: getattr(homebrew, name)
            for name in ("LlmChat", "UserMessage", "get_llm_api_key", "check_ai_access", "record_ai_usage")
        }

        homebrew.LlmChat = _FakeChat
        homebrew.UserMessage = lambda text=None, **kwargs: {"text": text}
        homebrew.get_llm_api_key = lambda *_args, **_kwargs: "test-key"

        async def _record(username):
            self.recorded.append(username)

        homebrew.record_ai_usage = _record

    def tearDown(self):
        for name, value in self._originals.items():
            setattr(homebrew, name, value)

    def _set_access(self, allowed):
        async def _check(username, feature='ai'):
            self.seen_feature = feature
            return allowed

        homebrew.check_ai_access = _check

    def _call(self):
        return asyncio.run(
            homebrew._llm_json("spell", "system prompt", "user prompt", "javen")
        )

    def test_llm_call_is_refused_once_the_monthly_limit_is_reached(self):
        self._set_access(False)

        with self.assertRaises(HTTPException) as caught:
            self._call()

        self.assertEqual(caught.exception.status_code, 403)
        self.assertIn("Monthly AI limit", caught.exception.detail)
        # The provider must not be billed for a refused request.
        self.assertEqual(_FakeChat.sent, 0)
        self.assertEqual(self.recorded, [])

    def test_successful_llm_call_is_recorded_against_the_caller(self):
        self._set_access(True)

        result = self._call()

        self.assertEqual(result, {"name": "Ember Brand"})
        self.assertEqual(_FakeChat.sent, 1)
        self.assertEqual(self.recorded, ["javen"])
        self.assertEqual(self.seen_feature, 'ai')

    def test_quota_is_checked_before_the_provider_is_contacted(self):
        """Order matters: a check after the call would still spend the credit."""
        source = Path(homebrew.__file__).read_text()
        body = source.split("async def _llm_json", 1)[1].split("\nasync def ", 1)[0]
        self.assertLess(
            body.index("check_ai_access"),
            body.index("send_message"),
            "check_ai_access must run before the provider request",
        )
        self.assertLess(
            body.index("send_message"),
            body.index("record_ai_usage"),
            "record_ai_usage must run after a successful provider request",
        )


class EveryHomebrewLlmRouteUsesTheMeteredHelperTests(unittest.TestCase):
    def test_homebrew_llm_routes_go_through_llm_json(self):
        """If a future route calls the provider directly it escapes the cap."""
        source = Path(homebrew.__file__).read_text()
        tree = ast.parse(source)

        direct_callers = set()
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if node.name == "_llm_json":
                continue
            for inner in ast.walk(node):
                if isinstance(inner, ast.Attribute) and inner.attr == "send_message":
                    direct_callers.add(node.name)

        self.assertEqual(
            direct_callers,
            set(),
            f"these functions bypass the metered _llm_json helper: {sorted(direct_callers)}",
        )


class OtherAiRoutesKeepTheirQuotaChecksTests(unittest.TestCase):
    """Structural guard for the LLM routes that need a live provider/database."""

    CASES = {
        "routes/ai.py": ("ai_generate_with_rules",),
        "routes/character_import.py": ("extract_character_sheet",),
        "routes/character_templates.py": ("ai_match_template",),
    }

    def _function(self, relative_path, function_name):
        tree = ast.parse((BACKEND_DIR / relative_path).read_text())
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == function_name:
                return node
        self.fail(f"{function_name} not found in {relative_path}")

    def test_each_route_checks_and_records_ai_usage(self):
        for relative_path, function_names in self.CASES.items():
            for function_name in function_names:
                with self.subTest(route=f"{relative_path}:{function_name}"):
                    called = {
                        node.func.id
                        for node in ast.walk(self._function(relative_path, function_name))
                        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                    }
                    self.assertIn("check_ai_access", called)
                    self.assertIn("record_ai_usage", called)

    def test_ai_generate_with_rules_authorises_campaign_access(self):
        """It used to read the campaign straight out of the database."""
        node = self._function("routes/ai.py", "ai_generate_with_rules")
        called = {
            inner.func.id
            for inner in ast.walk(node)
            if isinstance(inner, ast.Call) and isinstance(inner.func, ast.Name)
        }
        self.assertIn("verify_campaign_membership", called)


if __name__ == "__main__":
    unittest.main()
