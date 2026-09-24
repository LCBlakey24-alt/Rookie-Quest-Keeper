#!/usr/bin/env python3
"""Fail CI when integration/E2E tests contain a reusable-looking literal login pair."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_ROOTS = [
    ROOT / "backend" / "tests",
    ROOT / "tests" / "e2e",
    ROOT / "tests" / "fixtures",
]

EMAIL_ASSIGNMENT = re.compile(
    r"""(?ix)
    (?:
      \b[A-Z0-9_]*EMAIL\b\s*=\s*
      |
      \bemail\s*:\s*
    )
    ["'][^"'\n]+@[^"'\n]+["']
    """
)
PASSWORD_ASSIGNMENT = re.compile(
    r"""(?ix)
    (?:
      \b[A-Z0-9_]*PASSWORD\b\s*=\s*
      |
      \bpassword\s*:\s*
    )
    ["'][^"'\n]{4,}["']
    """
)
LOGIN_MARKERS = (
    "/auth/login",
    "login-email",
    "login-password",
    "login-btn",
)
TEXT_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx"}

violations: list[str] = []

for root in SCAN_ROOTS:
    if not root.exists():
        continue
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if not any(marker in text for marker in LOGIN_MARKERS):
            continue
        if EMAIL_ASSIGNMENT.search(text) and PASSWORD_ASSIGNMENT.search(text):
            violations.append(str(path.relative_to(ROOT)))

if violations:
    print("Reusable-looking literal test credentials found:")
    for path in sorted(set(violations)):
        print(f" - {path}")
    print("Use RQK_E2E_EMAIL/RQK_E2E_PASSWORD or create a disposable isolated user during the test.")
    sys.exit(1)

print("Credential guard passed.")
