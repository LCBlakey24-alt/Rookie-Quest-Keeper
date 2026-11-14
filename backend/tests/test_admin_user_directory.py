"""Admin member summaries must show only safe account information.

Site-wide permissions come from the canonical admin identity check, never
from a user-controlled role field or from being a campaign GM.
"""
import asyncio
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for key, value in {
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "rqk_admin_directory_unit_tests",
    "JWT_SECRET_KEY": "unit-test-only-secret",
    "APP_URL": "http://localhost:3000",
    "CORS_ORIGINS": "http://localhost:3000",
}.items():
    os.environ.setdefault(key, value)

spec = importlib.util.spec_from_file_location("rqk_admin_directory_tests", ROOT / "routes" / "admin.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FakeCounts:
    def __init__(self):
        self.queries = []

    async def count_documents(self, query):
        self.queries.append(query)
        return 0


def set_db(monkeypatch):
    fake_db = SimpleNamespace(
        player_characters=FakeCounts(),
        campaigns=FakeCounts(),
        campaign_members=FakeCounts(),
        improvement_feedback=FakeCounts(),
        reviews=FakeCounts(),
    )
    monkeypatch.setattr(module, "db", fake_db)
    return fake_db


def test_admin_summary_reports_real_role_and_safe_subscription_fields(monkeypatch):
    fake_db = set_db(monkeypatch)

    async def admin_match(username):
        return username == "owner"

    monkeypatch.setattr(module, "is_admin_username", admin_match)
    user = {
        "username": "owner", "email": "owner@example.test",
        "created_at": "2026-05-03T00:00:00Z", "password_hash": "secret",
        "role": "member",  # A misleading stored field must never override real admin identity.
        "subscription": {
            "tier": "pro", "subscription_status": "active",
            "stripe_customer_id": "secret-billing-id",
        },
    }
    result = asyncio.run(module._build_admin_user_summary(user))
    assert result["access_level"] == "admin"
    assert result["subscription_tier"] == "pro"
    assert result["subscription_status"] == "active"
    assert result["last_login_at"] is None
    assert "password_hash" not in result
    assert "stripe_customer_id" not in str(result)
    assert "subscription" not in result
    assert fake_db.campaigns.queries == [{"dm_user_id": "owner"}]


def test_member_role_is_not_inferred_from_campaign_gm_status(monkeypatch):
    set_db(monkeypatch)

    async def admin_match(_username):
        return False

    monkeypatch.setattr(module, "is_admin_username", admin_match)
    user = {
        "username": "member", "email": "member@example.test",
        "role": "admin",  # Must not be trusted.
        "last_login_at": "2026-11-14T10:00:00Z",
    }
    result = asyncio.run(module._build_admin_user_summary(user))
    assert result["access_level"] == "member"
    assert result["subscription_tier"] is None
    assert result["subscription_status"] is None
    assert result["last_login_at"] == "2026-11-14T10:00:00Z"


def test_nonadmin_cannot_query_account_directory(monkeypatch):
    class ForbiddenUsers:
        def find(self, *args, **kwargs):
            pytest.fail("User collection must not be read if admin authentication fails")

    async def reject(_username):
        raise HTTPException(status_code=403, detail="Admin access required")

    monkeypatch.setattr(module, "verify_admin", reject)
    monkeypatch.setattr(module, "db", SimpleNamespace(users=ForbiddenUsers()))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(module.admin_get_users(username="not-admin"))
    assert exc.value.status_code == 403
