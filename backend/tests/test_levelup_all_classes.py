#!/usr/bin/env python3
"""Comprehensive Level-Up Test for All 12 D&D Classes.

This module is primarily an integration script. It is intentionally skipped in
regular pytest runs unless explicit integration environment variables are set.
"""

import os
import requests
import sys
import pytest

BACKEND_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
API = f"{BACKEND_URL}/api" if BACKEND_URL else ""
EMAIL = os.environ.get("TEST_LOGIN_EMAIL", "")
PASSWORD = os.environ.get("TEST_LOGIN_PASSWORD", "")

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        not (API and EMAIL and PASSWORD),
        reason="Requires REACT_APP_BACKEND_URL, TEST_LOGIN_EMAIL, TEST_LOGIN_PASSWORD",
    ),
]

BASE_STATS = {"strength": 15, "dexterity": 14, "constitution": 13, "intelligence": 12, "wisdom": 10, "charisma": 14}
TEST_CASES = [
    {"cls": "Barbarian", "start": 2, "target": 3, "subclass": "berserker", "fs": None},
    {"cls": "Bard", "start": 2, "target": 3, "subclass": "college_of_lore", "fs": None},
    {"cls": "Cleric", "start": 1, "target": 2, "subclass": None, "fs": None},
    {"cls": "Druid", "start": 1, "target": 2, "subclass": "circle_of_the_land", "fs": None},
    {"cls": "Fighter", "start": 2, "target": 3, "subclass": "champion", "fs": None},
    {"cls": "Monk", "start": 2, "target": 3, "subclass": "way_of_the_open_hand", "fs": None},
    {"cls": "Paladin", "start": 1, "target": 2, "subclass": None, "fs": "Dueling"},
    {"cls": "Ranger", "start": 1, "target": 2, "subclass": None, "fs": "Archery"},
    {"cls": "Rogue", "start": 2, "target": 3, "subclass": "thief", "fs": None},
    {"cls": "Sorcerer", "start": 1, "target": 2, "subclass": None, "fs": None},
    {"cls": "Warlock", "start": 1, "target": 2, "subclass": None, "fs": None},
    {"cls": "Wizard", "start": 1, "target": 2, "subclass": "school_of_evocation", "fs": None},
]


def run_levelup_suite() -> int:
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text[:200]}")
        return 1

    token = r.json().get("token") or r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    results = []
    for tc in TEST_CASES:
        cls = tc["cls"]
        char_data = {"name": f"LvlUp_{cls}_{tc['start']}to{tc['target']}", "race": "Human", "character_class": cls, "level": tc["start"], **BASE_STATS}
        r = requests.post(f"{API}/characters", headers=headers, json=char_data, timeout=15)
        if r.status_code != 200:
            results.append({"class": cls, "levelup": "FAIL", "details": f"create failed: {r.status_code}"})
            continue

        char = r.json()
        char_id = char.get("character_id") or char.get("character", {}).get("id")
        payload = {"new_level": tc["target"], "hp_method": "average"}
        if tc["subclass"]:
            payload["subclass"] = tc["subclass"]
        if tc["fs"]:
            payload["fighting_style"] = tc["fs"]

        r = requests.post(f"{API}/characters/{char_id}/level-up", headers=headers, json=payload, timeout=15)
        if r.status_code != 200:
            results.append({"class": cls, "levelup": "FAIL", "details": f"level-up failed: {r.status_code}"})
            continue

        new_level = r.json().get("character", r.json()).get("level")
        status = "PASS" if new_level == tc["target"] else "FAIL"
        results.append({"class": cls, "levelup": status, "details": f"{tc['start']}->{new_level}"})

    failed = sum(1 for item in results if item["levelup"] == "FAIL")
    return 1 if failed else 0


def test_all_classes_levelup_integration():
    assert run_levelup_suite() == 0


if __name__ == "__main__":
    sys.exit(run_levelup_suite())
