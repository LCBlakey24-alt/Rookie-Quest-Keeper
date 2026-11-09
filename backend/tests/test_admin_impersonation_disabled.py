"""A site administrator cannot mint a different user's JWT.

Ordinary site management is separate from user-owned campaign and character
access. This regression test intentionally uses no real production users.
"""
import asyncio
import importlib.util
import os
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for key, value in {
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "rookiequestkeeper_test",
    "JWT_SECRET_KEY": "test-only-secret",
    "APP_URL": "http://localhost:3000",
    "CORS_ORIGINS": "http://localhost:3000",
}.items():
    os.environ.setdefault(key, value)

spec = importlib.util.spec_from_file_location("privacy_admin_route", ROOT / "routes" / "admin.py")
admin = importlib.util.module_from_spec(spec)
spec.loader.exec_module(admin)


@pytest.mark.parametrize("actor", ["site-admin", "normal-player"])
def test_no_account_can_impersonate_another_even_with_a_valid_login(monkeypatch, actor):
    class ForbiddenDb:
        def __getattr__(self, name):
            raise AssertionError(f"Impersonation must not query or mutate {name}")

    monkeypatch.setattr(admin, "db", ForbiddenDb())
    with pytest.raises(HTTPException) as denied:
        asyncio.run(admin.admin_impersonate_user(target_username="different-person", username=actor))
    assert denied.value.status_code == 403
    assert "disabled" in str(denied.value.detail).lower()


def test_route_stays_registered_as_a_deny_only_tombstone():
    routes = [route for route in admin.router.routes
              if getattr(route, "path", None) == "/admin/users/{target_username}/impersonate"]
    assert len(routes) == 1
    assert routes[0].methods == {"POST"}


def test_admin_cannot_export_every_users_private_campaign_titles(monkeypatch):
    class ForbiddenDb:
        def __getattr__(self, name):
            raise AssertionError(f"Private campaign export touched {name}")

    monkeypatch.setattr(admin, "db", ForbiddenDb())
    with pytest.raises(HTTPException) as denied:
        asyncio.run(admin.admin_export_campaigns_csv(username="site-admin"))
    assert denied.value.status_code == 403
