#!/usr/bin/env python3
"""Guard the public source tree against committed reusable test credentials.

This is a focused CI guard, not a historical Git secret scan or a substitute
for rotating any previously exposed credential. Never print secret values.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_ROOTS = [
    ROOT / "backend" / "tests",
    ROOT / "tests" / "e2e",
    ROOT / "tests" / "fixtures",
    ROOT / "memory" / "test_credentials.md",
]
TEXT_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".md"}

EMAIL_ASSIGNMENT = re.compile(
    r"""(?ix)(?:\b[A-Z0-9_]*EMAIL\b\s*=\s*|\bemail\s*:\s*)["'][^"'\n]+@[^"'\n]+["']"""
)
PASSWORD_ASSIGNMENT = re.compile(
    r"""(?ix)(?:\b[A-Z0-9_]*PASSWORD\b\s*=\s*|\bpassword\s*:\s*)["'][^"'\n]{4,}["']"""
)
LOGIN_MARKERS = ("/auth/login", "login-email", "login-password", "login-btn")
# Public mailbox addresses are not appropriate reusable test identities.
# Google account fixtures with fake addresses are tested separately.
PERSONAL_MAILBOX = re.compile(
    r"\b[A-Z0-9._%+-]+@(?:outlook\.com|hotmail\.com|live\.com|icloud\.com|proton\.me)\b",
    re.IGNORECASE,
)
# E2E secrets must never have a nonempty checked-in fallback.
E2E_JS_DEFAULT = re.compile(
    r"""process\.env\.RQK_E2E_(?:EMAIL|PASSWORD)\s*(?:\|\||\?\?)\s*(['"])([^'"]+)\1"""
)
E2E_PY_DEFAULT = re.compile(
    r"""(?:os\.environ\.get|os\.getenv)\(\s*['"]RQK_E2E_(?:EMAIL|PASSWORD)['"]\s*,\s*(['"])([^'"]+)\1"""
)
RESEND_SECRET = re.compile(r"\bre_[A-Za-z0-9]{20,}\b")


def scan_text(content: str) -> list[str]:
    """Return violation categories only: never include credentials in output."""
    findings: list[str] = []
    if any(marker in content for marker in LOGIN_MARKERS):
        if EMAIL_ASSIGNMENT.search(content) and PASSWORD_ASSIGNMENT.search(content):
            findings.append("literal login email/password pair")
    if PERSONAL_MAILBOX.search(content):
        findings.append("personal mailbox address in test source")
    if E2E_JS_DEFAULT.search(content) or E2E_PY_DEFAULT.search(content):
        findings.append("nonempty E2E credential fallback")
    if RESEND_SECRET.search(content):
        findings.append("possible Resend secret")
    return findings


def files_to_check():
    for root in SCAN_ROOTS:
        if root.is_file():
            yield root
            continue
        if root.is_dir():
            for path in root.rglob("*"):
                if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES:
                    yield path


def main() -> int:
    violations: list[tuple[str, str]] = []
    for path in files_to_check():
        content = path.read_text(encoding="utf-8", errors="ignore")
        for finding in scan_text(content):
            violations.append((str(path.relative_to(ROOT)), finding))

    if violations:
        print("Test-credential safety check failed (values are never printed):")
        for path, finding in sorted(set(violations)):
            print(f" - {path}: {finding}")
        print("Use protected RQK_E2E_EMAIL/RQK_E2E_PASSWORD or disposable test accounts.")
        return 1

    print("Test-credential safety check passed (current source only).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
