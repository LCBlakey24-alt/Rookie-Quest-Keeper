"""Password recovery must never fail silently.

The generic "if an account exists with this email, a reset link has been
sent" response is correct -- it stops an attacker enumerating addresses. But
it also meant a deployment with no RESEND_API_KEY accepted every reset
request, stored the token, sent nothing, and reported success. There was no
startup warning, no log at the point of failure, and nothing in the health
endpoints. The first sign of trouble would be a locked-out player.

The response stays generic to avoid account enumeration, but a globally unconfigured sending service reports 503 for all addresses. Failed sends retain older usable links.
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
os.environ.setdefault("JWT_SECRET_KEY", "password-recovery-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from routes.auth import _email_domain  # noqa: E402

AUTH_SOURCE = (BACKEND_DIR / "routes" / "auth.py").read_text()
SERVER_SOURCE = (BACKEND_DIR / "server.py").read_text()


def function_source(source, name):
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.get_source_segment(source, node) or ""
    raise AssertionError(f"{name} not found")


class EmailDomainHelperTests(unittest.TestCase):
    def test_it_returns_only_the_domain(self):
        self.assertEqual(_email_domain("Player@Example.COM"), "example.com")

    def test_it_never_returns_the_local_part(self):
        # The point of the helper is that logs identify the provider without
        # recording who asked for a reset.
        self.assertNotIn("player", _email_domain("player@example.com"))

    def test_it_tolerates_junk(self):
        for value in ("", None, "not-an-address"):
            with self.subTest(value=value):
                self.assertEqual(_email_domain(value), "unknown")


class SilentFailureIsReportedTests(unittest.TestCase):
    def test_a_missing_api_key_warns_at_import(self):
        self.assertIn("RESEND_API_KEY is not configured", AUTH_SOURCE)
        self.assertIn("logger.warning", AUTH_SOURCE)

    def test_an_unconfigured_send_logs_an_error(self):
        body = function_source(AUTH_SOURCE, "forgot_password")
        self.assertIn("EMAIL_DELIVERY_CONFIGURED", body)
        self.assertIn("logger.error", body)
        self.assertIn("status.HTTP_503_SERVICE_UNAVAILABLE", body)
        self.assertLess(body.index("if not EMAIL_DELIVERY_CONFIGURED:"), body.index("db.users.find_one"))

    def test_a_failed_send_logs_the_exception_type(self):
        body = function_source(AUTH_SOURCE, "forgot_password")
        self.assertIn("type(exc).__name__", body)

    def test_no_log_line_records_the_full_address(self):
        body = function_source(AUTH_SOURCE, "forgot_password")
        for line in body.splitlines():
            if "logger." in line or "request.email" in line:
                # request.email may be used for lookup and token storage, but
                # never handed to the logger directly.
                self.assertNotIn("logger.error(f", line)
        self.assertIn("_email_domain(email)", body)


class CallerFacingBehaviourIsUnchangedTests(unittest.TestCase):
    def test_the_response_is_still_identical_either_way(self):
        body = function_source(AUTH_SOURCE, "forgot_password")
        generic = body.count('"If an account exists with this email, a reset link will be sent"')
        # Every outcome that could disclose account existence returns the same object.
        self.assertEqual(generic, 1)
        self.assertGreaterEqual(body.count('return generic_response'), 3)

    def test_an_unknown_account_still_returns_before_creating_a_token(self):
        body = function_source(AUTH_SOURCE, "forgot_password")
        self.assertLess(body.index("if not user:"), body.index("secrets.token_urlsafe"))

    def test_global_email_outage_is_reported_for_every_address(self):
        body = function_source(AUTH_SOURCE, "forgot_password")
        self.assertIn("raise HTTPException", body)
        self.assertIn("status.HTTP_503_SERVICE_UNAVAILABLE", body)


class OperatorCanSeeDeliveryStatusTests(unittest.TestCase):
    def test_readiness_reports_email_delivery(self):
        self.assertIn('"email_delivery"', SERVER_SOURCE)
        self.assertIn("not-configured", SERVER_SOURCE)

    def test_email_delivery_does_not_change_readiness_status(self):
        # The backend serves fine without email; this is information, not a
        # reason to fail a health check and take the service out of rotation.
        body = function_source(SERVER_SOURCE, "readiness_check")
        self.assertIn('"status": "ready"', body)
        self.assertNotIn("EMAIL_DELIVERY_CONFIGURED else 503", body)


class ResetEmailUsesTheCurrentPaletteTests(unittest.TestCase):
    def test_the_retired_red_is_gone(self):
        self.assertNotIn("#d00000", AUTH_SOURCE)

    def test_reset_button_uses_solid_navy_cream_and_citrus_underline(self):
        self.assertIn("background: #0B1B2B; color: #EADFC8", AUTH_SOURCE)
        self.assertIn("height: 3px; width: 155px; background: #FF8A1F", AUTH_SOURCE)
        self.assertIn("linear-gradient(90deg, #FF8A1F 0%", AUTH_SOURCE)
        self.assertNotIn("display: inline-block; background: linear-gradient", AUTH_SOURCE)

    def test_provider_errors_cannot_log_the_entire_exception(self):
        body = function_source(AUTH_SOURCE, "forgot_password")
        self.assertIn("type(exc).__name__", body)
        self.assertNotIn("type(exc).__name__, exc", body)
        self.assertNotIn("logger.exception", body)


if __name__ == "__main__":
    unittest.main()
