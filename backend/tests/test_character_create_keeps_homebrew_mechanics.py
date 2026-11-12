"""Creating or editing a character keeps the builder's homebrew mechanics.

POST /characters is served by routes.character_patch (mounted before
routes.characters), which cleans the payload through the PATCH allow-list.
Seven homebrew mechanics fields were missing from it and were dropped.
"""
import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes.character_patch import HOMEBREW_MECHANICS_FIELDS, _clean_create, _clean_patch  # noqa: E402

MECHANICS = {
    'homebrew_resources': [{'name': 'Scarab Charges', 'max': 'warlock level', 'source': 'Scarab Pact'}],
    'homebrew_actions': [{'name': 'Spend a Scarab', 'cost': 1}],
    'passive_effects': [{'name': 'Shell', 'ac_bonus': 1}],
    'homebrew_scaling': [{'level': 5, 'note': 'Charges double'}],
    'homebrew_upgrades': [{'level': 6, 'name': 'Swarm'}],
    'homebrew_automation_notes': ['Add Scarab Charges to resources'],
    'homebrew_content_refs': [{'type': 'subclass', 'id': 'hb-1'}],
}


def test_there_are_seven_mechanics_fields():
    assert set(HOMEBREW_MECHANICS_FIELDS) == set(MECHANICS)


def test_create_keeps_every_homebrew_mechanics_field():
    created = _clean_create({'name': 'Kepri', 'character_class': 'Warlock', **MECHANICS}, 'player')
    for field, value in MECHANICS.items():
        assert created[field] == value, field


@pytest.mark.parametrize('field', sorted(MECHANICS))
def test_edit_keeps_each_homebrew_mechanics_field(field):
    assert _clean_patch({field: MECHANICS[field]})[field] == MECHANICS[field]
