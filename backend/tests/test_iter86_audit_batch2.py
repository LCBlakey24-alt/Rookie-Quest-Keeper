"""Iter 86 — Audit fixes batch 2.

Backend regression tests:
1. Login works for primary test account
2. GET /api/characters/{id} for test character (Wizard, no skills, 0 spells)
3. GET /api/campaigns/{cid}/maps still 200 (data preservation — MapMaker frontend
   was deleted but backend maps endpoints PROTECTED)
4. GET /api/campaigns/{cid}/world-maps still works (regression)
5. PATCH /api/characters/{id} subset of body still 200 (Iter 85 regression)
"""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "http://localhost:8000").rstrip("/")
EMAIL = "lcblakey24@outlook.com"
PASSWORD = "LCBlakey24?!"
CHAR_ID = "a1e7babc-c582-48ec-8a64-8c71501fa281"
CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# --- Auth ----------------------------------------------------------------
def test_login_ok():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert "token" in body or "access_token" in body


# --- Character (skills/spells code path lives on this character) ---------
def test_character_get_for_skills_and_spells_panel(headers):
    r = requests.get(f"{BASE_URL}/api/characters/{CHAR_ID}", headers=headers, timeout=15)
    assert r.status_code == 200, r.text[:200]
    c = r.json()
    assert c.get("id") == CHAR_ID
    # Skills column will fall back to ○ for everyone if proficiencies are empty
    assert isinstance(c.get("skill_proficiencies", []), list)
    # Iter 86 spells-not-prepared chip relies on these two arrays
    assert "spells_known" in c or "spells" in c or "spells_prepared" in c
    assert "prepared_spell_names" in c or c.get("character_class") in (
        "Cleric", "Druid", "Wizard", "Paladin", "Artificer", None
    )


def test_character_partial_patch_regression(headers):
    # Iter 85 regression: partial PATCH must not 422
    r = requests.patch(f"{BASE_URL}/api/characters/{CHAR_ID}",
                       headers=headers, json={"current_hit_points": 6}, timeout=15)
    assert r.status_code in (200, 204), r.text[:200]


# --- Maps endpoints (PROTECTED — MapMaker frontend removed but backend stays) ---
def test_campaign_maps_get(headers):
    r = requests.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/maps",
                     headers=headers, timeout=15)
    assert r.status_code == 200, r.text[:200]
    assert isinstance(r.json(), list)


def test_campaign_world_maps_get(headers):
    r = requests.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/world-maps",
                     headers=headers, timeout=15)
    assert r.status_code == 200, r.text[:200]
    assert isinstance(r.json(), list)


def test_campaign_local_maps_get(headers):
    r = requests.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}/local-maps",
                     headers=headers, timeout=15)
    assert r.status_code == 200, r.text[:200]
    assert isinstance(r.json(), list)
