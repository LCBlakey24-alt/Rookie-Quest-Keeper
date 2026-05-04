"""Iter 84: Campaign rules_edition field + AI prompt edition fragment."""
import os, requests, pytest

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
EMAIL = "lcblakey24@outlook.com"
PASSWORD = "LCBlakey24?!"
CAMPAIGN_ID = "b51ba0e9-5b08-44ed-b3dd-4a97dd2a09f6"


@pytest.fixture(scope="module")
def auth():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


def test_campaign_get_has_rules_edition(auth):
    r = auth.get(f"{BASE}/api/campaigns/{CAMPAIGN_ID}", timeout=10)
    assert r.status_code == 200, r.text
    assert "rules_edition" in r.json()


def _full_put(auth, edition):
    cur = auth.get(f"{BASE}/api/campaigns/{CAMPAIGN_ID}", timeout=10).json()
    body = {
        "name": cur.get("name", "TEST"),
        "description": cur.get("description", ""),
        "system": cur.get("system", "5e 2024 Compatible"),
        "rules_edition": edition,
        "world_setting": cur.get("world_setting", "custom"),
        "world_setting_notes": cur.get("world_setting_notes", ""),
    }
    return auth.put(f"{BASE}/api/campaigns/{CAMPAIGN_ID}", json=body, timeout=10)


def test_put_rules_edition_2014_persists(auth):
    r = _full_put(auth, "2014")
    assert r.status_code in (200, 204), r.text
    g = auth.get(f"{BASE}/api/campaigns/{CAMPAIGN_ID}", timeout=10)
    assert g.json().get("rules_edition") == "2014"


def test_put_rules_edition_2024_restores(auth):
    r = _full_put(auth, "2024")
    assert r.status_code in (200, 204), r.text
    g = auth.get(f"{BASE}/api/campaigns/{CAMPAIGN_ID}", timeout=10)
    assert g.json().get("rules_edition") == "2024"


def test_edition_helper_strings_present():
    """Code review: helper has 2024 and 2014 mechanic markers."""
    with open("/app/backend/routes/ai.py") as f:
        src = f.read()
    assert "Origin Feats" in src
    assert "Weapon Mastery" in src
    assert "Subclasses chosen at level 3" in src
    assert "Race grants ASIs" in src
    assert "Half-Elf, Half-Orc" in src
    assert src.count("edition_prompt_fragment(campaign)") >= 6
