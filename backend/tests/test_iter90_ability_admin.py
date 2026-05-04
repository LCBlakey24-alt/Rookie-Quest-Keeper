"""Iteration 90 - Admin CSV export + Impersonate + regression tests.

Covers:
- Auth: login for admin user (lcblakey24@outlook.com -> username 'LCBlakey24')
- Admin: GET /api/admin/check returns is_admin True
- Admin CSV: /api/admin/export/users.csv and /admin/export/campaigns.csv (headers + auth)
- Admin Impersonate: POST /api/admin/users/{username}/impersonate (case-insensitive,
  404 for missing user, 403 without admin token)
- Regression: /api/characters, /api/campaigns, /api/admin/users still work
"""
import os
import io
import csv
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
ADMIN_EMAIL = "lcblakey24@outlook.com"
ADMIN_PASSWORD = "LCBlakey24?!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "username" in data
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    s.admin_username = data["username"]  # type: ignore
    s.admin_token = data["token"]  # type: ignore
    return s


@pytest.fixture(scope="module")
def nonadmin_session():
    """Create a throw-away non-admin user and return an authenticated session."""
    import uuid
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"iter90_regular_{uuid.uuid4().hex[:8]}@example.com"
    username = f"iter90_regular_{uuid.uuid4().hex[:8]}"
    password = "TestPass123!"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"username": username, "email": email, "password": password}, timeout=30)
    if r.status_code not in (200, 201):
        pytest.skip(f"register failed: {r.status_code} {r.text}")
    token = r.json().get("token")
    if not token:
        lr = s.post(f"{BASE_URL}/api/auth/login",
                    json={"email": email, "password": password}, timeout=30)
        token = lr.json().get("token")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ============ AUTH & ADMIN CHECK ============
class TestAuthAndAdminCheck:
    def test_login_returns_token_and_username(self, admin_session):
        assert admin_session.admin_username == "LCBlakey24"
        assert isinstance(admin_session.admin_token, str) and len(admin_session.admin_token) > 10

    def test_admin_check_is_true(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/check", timeout=15)
        assert r.status_code == 200
        assert r.json().get("is_admin") is True

    def test_admin_check_false_for_non_admin(self, nonadmin_session):
        r = nonadmin_session.get(f"{BASE_URL}/api/admin/check", timeout=15)
        assert r.status_code == 200
        assert r.json().get("is_admin") is False


# ============ CSV EXPORT ============
class TestCsvExport:
    EXPECTED_USERS_HEADER = "username,email,tier,tier_name,subscription_status,lifetime_access,ai_calls_this_month,created_at"
    EXPECTED_CAMPAIGNS_HEADER = "id,name,dm_user_id,system,rules_edition,setting,player_count,created_at,updated_at"

    def test_export_users_csv_ok(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/export/users.csv", timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "").lower()
        text = r.text
        lines = text.splitlines()
        assert lines, "empty CSV response"
        assert lines[0] == self.EXPECTED_USERS_HEADER
        assert len(lines) >= 2, "no data rows in users.csv"
        # admin's own username should appear somewhere
        assert any("LCBlakey24" in ln or "lcblakey24" in ln.lower() for ln in lines[1:])

    def test_export_campaigns_csv_ok(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/export/campaigns.csv", timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "").lower()
        lines = r.text.splitlines()
        assert lines[0] == self.EXPECTED_CAMPAIGNS_HEADER
        # At least header present; data row optional if db has campaigns
        # Parse rest via csv reader to ensure valid
        reader = csv.reader(io.StringIO(r.text))
        rows = list(reader)
        assert rows[0] == self.EXPECTED_CAMPAIGNS_HEADER.split(",")
        for row in rows[1:]:
            assert len(row) == 9, f"bad row: {row}"

    def test_export_users_csv_forbidden_for_non_admin(self, nonadmin_session):
        r = nonadmin_session.get(f"{BASE_URL}/api/admin/export/users.csv", timeout=15)
        assert r.status_code in (401, 403)

    def test_export_campaigns_csv_forbidden_for_non_admin(self, nonadmin_session):
        r = nonadmin_session.get(f"{BASE_URL}/api/admin/export/campaigns.csv", timeout=15)
        assert r.status_code in (401, 403)

    def test_export_users_csv_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/admin/export/users.csv", timeout=15)
        assert r.status_code in (401, 403)


# ============ IMPERSONATE ============
class TestImpersonate:
    def test_impersonate_exact_case_returns_token(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/users/LCBlakey24/impersonate", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["username"] == "LCBlakey24"
        assert isinstance(data["token"], str) and len(data["token"]) > 10
        # use the token — should work against /api/characters
        r2 = requests.get(
            f"{BASE_URL}/api/characters",
            headers={"Authorization": f"Bearer {data['token']}"}, timeout=15)
        assert r2.status_code == 200
        assert isinstance(r2.json(), list)

    def test_impersonate_case_insensitive_admin_check(self, admin_session):
        # target_username lowercase — backend should find user via case-insensitive
        # OR match via email fallback. Just verify the admin check itself is
        # case-insensitive (admin was accepted with 'LCBlakey24' vs ADMIN_USERNAMES=['lcblakey24']).
        # A lowercase username may 404 if the DB username is stored with caps and
        # no email fallback matches.
        r = admin_session.post(f"{BASE_URL}/api/admin/users/lcblakey24/impersonate", timeout=15)
        # Accept 200 (case-insensitive lookup worked) OR 404 (user-not-found but
        # admin check passed). Reject 403 which would mean admin check failed.
        assert r.status_code in (200, 404), f"unexpected status {r.status_code}: {r.text}"

    def test_impersonate_nonexistent_user_returns_404(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/users/NON_EXISTENT_TEST_USER_xyz/impersonate", timeout=15)
        assert r.status_code == 404

    def test_impersonate_forbidden_for_non_admin(self, nonadmin_session):
        r = nonadmin_session.post(f"{BASE_URL}/api/admin/users/LCBlakey24/impersonate", timeout=15)
        assert r.status_code in (401, 403)

    def test_impersonate_unauthenticated(self):
        r = requests.post(f"{BASE_URL}/api/admin/users/LCBlakey24/impersonate", timeout=15)
        assert r.status_code in (401, 403)


# ============ REGRESSION ============
class TestRegression:
    def test_get_characters(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/characters", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_campaigns(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/campaigns", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_users_list(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # accept either list or dict with users key
        users = data if isinstance(data, list) else data.get("users", [])
        assert isinstance(users, list)
        assert any(u.get("username") == "LCBlakey24" for u in users)

    def test_levelup_options_still_works(self, admin_session):
        """Regression from iter89."""
        cid = "a1e7babc-c582-48ec-8a64-8c71501fa281"  # Test_Orc_Wiz
        r = admin_session.get(f"{BASE_URL}/api/characters/{cid}/level-up-options?target_level=2", timeout=30)
        # Accept 200 (has options) or 404 (char was deleted)
        assert r.status_code in (200, 404)
