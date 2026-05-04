"""Backend tests for iteration 83:
- PATCH used_spell_slots persistence
- PATCH conditions persistence
- POST long-rest / short-rest still work
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")

EMAIL = "lcblakey24@outlook.com"
PASSWORD = "LCBlakey24?!"
CHAR_ID = "a1e7babc-c582-48ec-8a64-8c71501fa281"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in {data}"
    return tok


@pytest.fixture(scope="module")
def client(token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


# --- used_spell_slots persistence ---
class TestUsedSpellSlots:
    def test_patch_used_spell_slots_persists(self, client):
        # Patch used_spell_slots to {"1": 1}
        r = client.patch(f"{BASE_URL}/api/characters/{CHAR_ID}", json={"used_spell_slots": {"1": 1}}, timeout=20)
        assert r.status_code == 200, f"PATCH failed: {r.status_code} {r.text}"
        # GET to verify persistence
        g = client.get(f"{BASE_URL}/api/characters/{CHAR_ID}", timeout=20)
        assert g.status_code == 200
        data = g.json()
        uss = data.get("used_spell_slots") or {}
        assert str(uss.get("1", uss.get(1))) == "1", f"used_spell_slots not persisted: {uss}"

    def test_patch_used_spell_slots_reset(self, client):
        # reset back to empty
        r = client.patch(f"{BASE_URL}/api/characters/{CHAR_ID}", json={"used_spell_slots": {}}, timeout=20)
        assert r.status_code == 200
        g = client.get(f"{BASE_URL}/api/characters/{CHAR_ID}", timeout=20)
        assert g.status_code == 200
        uss = g.json().get("used_spell_slots") or {}
        # Accept empty dict or missing
        assert uss in ({}, None) or all(int(v) == 0 for v in uss.values()), f"expected empty, got {uss}"


# --- conditions persistence ---
class TestConditions:
    def test_patch_conditions_persists(self, client):
        r = client.patch(f"{BASE_URL}/api/characters/{CHAR_ID}", json={"conditions": ["blinded", "grappled"]}, timeout=20)
        assert r.status_code == 200, f"PATCH failed: {r.status_code} {r.text}"
        g = client.get(f"{BASE_URL}/api/characters/{CHAR_ID}", timeout=20)
        assert g.status_code == 200
        conds = g.json().get("conditions") or []
        assert set(conds) >= {"blinded", "grappled"}, f"conditions missing: {conds}"

    def test_patch_conditions_clears(self, client):
        r = client.patch(f"{BASE_URL}/api/characters/{CHAR_ID}", json={"conditions": []}, timeout=20)
        assert r.status_code == 200
        g = client.get(f"{BASE_URL}/api/characters/{CHAR_ID}", timeout=20)
        conds = g.json().get("conditions") or []
        assert conds == [], f"expected empty, got {conds}"


# --- rest endpoints ---
class TestRestEndpoints:
    def test_long_rest(self, client):
        # First PATCH HP to something lower and spend a slot
        client.patch(f"{BASE_URL}/api/characters/{CHAR_ID}", json={"current_hit_points": 1, "used_spell_slots": {"1": 1}}, timeout=20)
        r = client.post(f"{BASE_URL}/api/characters/{CHAR_ID}/long-rest", timeout=30)
        assert r.status_code == 200, f"long-rest failed: {r.status_code} {r.text}"
        g = client.get(f"{BASE_URL}/api/characters/{CHAR_ID}", timeout=20)
        data = g.json()
        # HP should be restored to max
        assert data.get("current_hit_points") == data.get("max_hit_points"), f"HP not restored: {data.get('current_hit_points')}/{data.get('max_hit_points')}"

    def test_short_rest(self, client):
        r = client.post(f"{BASE_URL}/api/characters/{CHAR_ID}/short-rest?hit_dice_to_spend=1", timeout=30)
        # Accept 200 or 400 if no hit dice available
        assert r.status_code in (200, 400), f"short-rest unexpected: {r.status_code} {r.text}"
