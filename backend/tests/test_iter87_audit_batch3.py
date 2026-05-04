"""Iter 87 backend regression: login, character GET/PATCH, campaign GET."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/') or 'http://localhost:8000'
EMAIL = 'lcblakey24@outlook.com'
PASSWORD = 'LCBlakey24?!'
CHAR_ID = 'a1e7babc-c582-48ec-8a64-8c71501fa281'
CAMPAIGN_ID = 'b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6'


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get('token') or data.get('access_token')
    assert tok, f"No token in login response: {list(data.keys())}"
    return tok


@pytest.fixture
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_login_returns_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert (data.get('token') or data.get('access_token'))


def test_get_character_by_id(headers):
    r = requests.get(f"{BASE_URL}/api/characters/{CHAR_ID}", headers=headers, timeout=30)
    assert r.status_code == 200, f"GET char failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    assert data.get('id') == CHAR_ID
    assert 'name' in data
    assert 'class_name' in data or 'character_class' in data or 'class' in data


def test_patch_character_partial_hp(headers):
    r = requests.patch(
        f"{BASE_URL}/api/characters/{CHAR_ID}",
        headers=headers,
        json={"current_hit_points": 5},
        timeout=30,
    )
    assert r.status_code == 200, f"PATCH failed: {r.status_code} {r.text[:200]}"
    # Verify persistence
    g = requests.get(f"{BASE_URL}/api/characters/{CHAR_ID}", headers=headers, timeout=30)
    assert g.status_code == 200
    assert g.json().get('current_hit_points') == 5


def test_get_campaign_by_id(headers):
    r = requests.get(f"{BASE_URL}/api/campaigns/{CAMPAIGN_ID}", headers=headers, timeout=30)
    assert r.status_code == 200, f"GET campaign failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    assert data.get('id') == CAMPAIGN_ID
    assert 'name' in data
