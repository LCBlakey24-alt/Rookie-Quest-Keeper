"""Regression tests for the test-credentials CI guard.

The strings below are synthetic examples, not live credentials.
"""
import importlib.util
import unittest
from pathlib import Path

module_path = Path(__file__).with_name("check_test_credentials.py")
spec = importlib.util.spec_from_file_location("credential_guard", module_path)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class TestCredentialGuard(unittest.TestCase):
    def test_rejects_literal_login_pair_without_printing_values(self):
        source = '/auth/login\nEMAIL = "sample@example.com"\nPASSWORD = "SAMPLE_PASS_XYZ"'
        findings = guard.scan_text(source)
        self.assertIn("literal login email/password pair", findings)
        self.assertNotIn("SAMPLE_PASS_XYZ", str(findings))

    def test_rejects_nonempty_js_fallback(self):
        source = "const password = process.env.RQK_E2E_PASSWORD || 'EXAMPLE_SECRET';"
        self.assertIn("nonempty E2E credential fallback", guard.scan_text(source))

    def test_rejects_nonempty_python_fallback(self):
        source = 'password = os.getenv("RQK_E2E_PASSWORD", "EXAMPLE_SECRET")'
        self.assertIn("nonempty E2E credential fallback", guard.scan_text(source))

    def test_rejects_personal_mailbox_even_inside_comment(self):
        source = "# old admin login: someone@outlook.com"
        self.assertIn("personal mailbox address in test source", guard.scan_text(source))

    def test_rejects_key_shaped_provider_secret_without_value_in_report(self):
        secret = "re_" + "A" * 25
        findings = guard.scan_text("password = '" + secret + "'")
        self.assertIn("possible Resend secret", findings)
        self.assertNotIn(secret, str(findings))

    def test_accepts_empty_defaults_or_protected_runtime_environment(self):
        source = """
        const email = process.env.RQK_E2E_EMAIL || '';
        const password = process.env.RQK_E2E_PASSWORD ?? "";
        username = os.getenv("RQK_E2E_EMAIL", "")
        password = os.getenv("RQK_E2E_PASSWORD", "")
        """
        self.assertEqual([], guard.scan_text(source))

    def test_accepts_disposable_registration_credentials(self):
        source = """email = f"player_{uuid4().hex}@example.com"
password = "test-only-randomized"
requests.post('/auth/register', json={'email': email, 'password': password})
"""
        self.assertEqual([], guard.scan_text(source))


if __name__ == "__main__":
    unittest.main()
