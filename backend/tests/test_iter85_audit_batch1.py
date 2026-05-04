"""
Iter 85 — Audit fixes batch 1
Backend regression: verify PATCH /api/characters/{id} accepts current_hit_points,
temporary_hit_points, conditions (used by combat-end HP sync flow) without 422.
Also verifies campaign rules_edition still works (regression).
"""
import os
import requests
import pytest

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or 'http://localhost:8000').rstrip('/')
API = f"{BASE_URL}/api"

EMAIL = "lcblakey24@outlook.com"
PASSWORD = "LCBlakey24?!"
CHAR_ID = "a1e7babc-c582-48ec-8a64-8c71501fa281"
CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def test_login_works(session):
    r = session.get(f"{API}/characters")
    assert r.status_code == 200


def test_get_character(session):
    r = session.get(f"{API}/characters/{CHAR_ID}")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == CHAR_ID
    print(f"Character HP: {data.get('current_hit_points')}/{data.get('hit_points')}")


def test_patch_combat_hp_sync_fields(session):
    """The combat-end HP sync uses PATCH with current_hit_points / temporary_hit_points / conditions."""
    # First get current values to restore after
    pre = session.get(f"{API}/characters/{CHAR_ID}").json()
    original_chp = pre.get("current_hit_points")
    original_thp = pre.get("temporary_hit_points", 0)
    original_conditions = pre.get("conditions", [])

    payload = {
        "current_hit_points": max(1, (original_chp or 10) - 1),
        "temporary_hit_points": 3,
        "conditions": ["blinded"],
    }
    r = session.patch(f"{API}/characters/{CHAR_ID}", json=payload)
    assert r.status_code == 200, f"PATCH failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["current_hit_points"] == payload["current_hit_points"]
    assert body["temporary_hit_points"] == 3
    assert "blinded" in body.get("conditions", [])

    # Verify GET persists
    g = session.get(f"{API}/characters/{CHAR_ID}").json()
    assert g["current_hit_points"] == payload["current_hit_points"]
    assert g["temporary_hit_points"] == 3
    assert "blinded" in g.get("conditions", [])

    # Restore
    restore = {
        "current_hit_points": original_chp,
        "temporary_hit_points": original_thp,
        "conditions": original_conditions,
    }
    rr = session.patch(f"{API}/characters/{CHAR_ID}", json=restore)
    assert rr.status_code == 200


def test_patch_partial_only_chp(session):
    """PATCH with only current_hit_points should not 422."""
    pre = session.get(f"{API}/characters/{CHAR_ID}").json()
    original = pre.get("current_hit_points")
    r = session.patch(f"{API}/characters/{CHAR_ID}", json={"current_hit_points": original})
    assert r.status_code == 200, f"Partial PATCH failed: {r.status_code} {r.text}"


def test_campaign_rules_edition_regression(session):
    """Iter 84 regression: campaign returns rules_edition."""
    r = session.get(f"{API}/campaigns/{CAMPAIGN_ID}")
    assert r.status_code == 200
    data = r.json()
    assert "rules_edition" in data
    assert data["rules_edition"] in ("2014", "2024")
