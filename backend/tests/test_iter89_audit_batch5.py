"""Iter 89 audit batch 5 tests.

Coverage:
1. Admin character-templates CRUD (list/patch/clone/delete) — case-insensitive admin
2. Level-up preflight no regression after public-helper refactor
3. routes/ai.py dedupe — endpoints still respond
4. PATCH /api/characters/{id} personality fields whitelist
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
EMAIL = "lcblakey24@outlook.com"
PASSWORD = "LCBlakey24?!"
TEST_CHAR_ID = "a1e7babc-c582-48ec-8a64-8c71501fa281"
TEST_CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"


@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ── Admin Templates CRUD ────────────────────────────────────────────────────
class TestAdminTemplates:
    def test_admin_list_returns_24(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/character-templates", headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "templates" in data
        assert data["total"] == len(data["templates"])
        assert len(data["templates"]) >= 24, f"expected 24+, got {len(data['templates'])}"
        ids = {t["id"] for t in data["templates"]}
        assert "tmpl-thorne-fighter" in ids
        assert "tmpl-2024-thorne-fighter" in ids

    def test_admin_endpoint_403_for_non_admin(self):
        # Create a temp user to verify 403
        uname = f"TEST_nonadmin_{int(time.time())}"
        reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": uname, "email": f"{uname}@x.com", "password": "Testpass1!"
        }, timeout=20)
        if reg.status_code not in (200, 201):
            pytest.skip(f"Couldn't create non-admin user: {reg.status_code} {reg.text[:150]}")
        tok = reg.json().get("token") or reg.json().get("access_token")
        if not tok:
            login = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": f"{uname}@x.com", "password": "Testpass1!"
            }, timeout=20)
            tok = login.json().get("token") or login.json().get("access_token")
        h = {"Authorization": f"Bearer {tok}"}
        r = requests.get(f"{BASE_URL}/api/admin/character-templates", headers=h, timeout=20)
        assert r.status_code == 403, f"expected 403 for non-admin, got {r.status_code}: {r.text[:200]}"

    def test_admin_patch_toggle_active(self, auth_headers):
        tid = "tmpl-thorne-fighter"
        # Toggle off
        r1 = requests.patch(f"{BASE_URL}/api/admin/character-templates/{tid}", headers=auth_headers,
                            json={"active": False}, timeout=20)
        assert r1.status_code == 200, r1.text
        assert r1.json().get("active") is False
        # Verify via GET (admin list still shows it because admin includes inactive)
        r_get = requests.get(f"{BASE_URL}/api/admin/character-templates", headers=auth_headers, timeout=20)
        thorne = next((t for t in r_get.json()["templates"] if t["id"] == tid), None)
        assert thorne and thorne["active"] is False
        # Toggle back on
        r2 = requests.patch(f"{BASE_URL}/api/admin/character-templates/{tid}", headers=auth_headers,
                            json={"active": True}, timeout=20)
        assert r2.status_code == 200
        assert r2.json().get("active") is True

    def test_admin_clone_and_delete_clone(self, auth_headers):
        # Clone elara
        r = requests.post(f"{BASE_URL}/api/admin/character-templates/tmpl-elara-wizard/clone",
                          headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        clone = r.json()
        assert clone["id"].startswith("tmpl-custom-"), clone["id"]
        assert clone["name"] == "Elara Moonveil (Clone)"
        assert clone["source"] == "homebrew"
        assert clone["active"] is True
        # Delete the clone (homebrew → allowed)
        rd = requests.delete(f"{BASE_URL}/api/admin/character-templates/{clone['id']}",
                             headers=auth_headers, timeout=20)
        assert rd.status_code == 200, rd.text
        assert rd.json().get("deleted") == clone["id"]

    def test_admin_delete_core_blocked(self, auth_headers):
        r = requests.delete(f"{BASE_URL}/api/admin/character-templates/tmpl-thorne-fighter",
                            headers=auth_headers, timeout=20)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"
        assert "core" in r.text.lower()


# ── Level-up preflight (public helper refactor regression) ──────────────────
class TestLevelUpPreflight:
    def test_preflight_l1_to_l2_has_all_fields(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/characters/{TEST_CHAR_ID}/level-up-options?target_level=2",
            headers=auth_headers, timeout=20
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Required fields after refactor
        for f in ["subclass_options", "feat_options", "spells_to_learn",
                  "cantrips_to_learn", "spells_known_table", "cantrips_known_table"]:
            assert f in data, f"missing {f} in preflight response. keys={list(data.keys())}"
        assert isinstance(data["spells_known_table"], (list, dict))
        assert isinstance(data["cantrips_known_table"], (list, dict))


# ── routes/ai.py dedupe regression ──────────────────────────────────────────
class TestAiRoutesAfterDedupe:
    def test_ai_generate_with_rules_responds(self, auth_headers):
        # Just confirm the endpoint is reachable & returns a non-5xx
        r = requests.post(
            f"{BASE_URL}/api/ai-generate-with-rules",
            headers=auth_headers,
            json={"prompt": "describe a tavern in one sentence", "campaign_id": TEST_CAMPAIGN_ID},
            timeout=60,
        )
        assert r.status_code < 500, f"server error: {r.status_code} {r.text[:200]}"

    def test_rook_chat_responds(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/rook/chat",
            headers=auth_headers,
            json={"message": "hello rook", "campaign_id": TEST_CAMPAIGN_ID},
            timeout=60,
        )
        assert r.status_code < 500, f"server error: {r.status_code} {r.text[:200]}"

    def test_session_outline_responds(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/ai/session-outline/{TEST_CAMPAIGN_ID}",
            headers=auth_headers,
            json={},
            timeout=60,
        )
        assert r.status_code < 500, f"server error: {r.status_code} {r.text[:200]}"


# ── Personality fields whitelist on PATCH /api/characters/{id} ──────────────
class TestPersonalityPatch:
    def test_patch_persists_5_personality_fields(self, auth_headers):
        payload = {
            "personality_trait": "TEST_I cite obscure books in conversation.",
            "ideal": "TEST_Knowledge is the path to power.",
            "bond": "TEST_My library is my home.",
            "flaw": "TEST_I overlook the obvious in pursuit of the rare.",
            "backstory": "TEST_Raised in a hidden archive of mages.",
        }
        r = requests.patch(f"{BASE_URL}/api/characters/{TEST_CHAR_ID}", headers=auth_headers,
                           json=payload, timeout=20)
        assert r.status_code == 200, f"PATCH failed: {r.status_code} {r.text[:300]}"
        body = r.json()
        for k, v in payload.items():
            assert body.get(k) == v, f"{k} not echoed in response: got {body.get(k)!r}"
        # GET to confirm persistence
        rg = requests.get(f"{BASE_URL}/api/characters/{TEST_CHAR_ID}", headers=auth_headers, timeout=20)
        assert rg.status_code == 200
        gbody = rg.json()
        for k, v in payload.items():
            assert gbody.get(k) == v, f"{k} not persisted: got {gbody.get(k)!r}"
