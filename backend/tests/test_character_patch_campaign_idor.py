"""Regression tests: a character PATCH must not be able to grant campaign access.

verify_campaign_membership (utils/auth.py) has a legacy fallback that accepts
"this user owns a character whose campaign_id is X" as proof of membership, for
campaigns that predate campaign_members rows. While campaign_id sat in
ALLOWED_CHARACTER_PATCH_FIELDS, any user could PATCH their own character with a
campaign_id they merely knew and thereby mint their own membership -- bypassing
the join-code and GM-approval flow and unlocking every membership-gated route
for that campaign.

Ownership of these fields belongs to the dedicated gated routes:
POST /characters/{id}/link-campaign, and the invite/approval flows.
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

from routes.character_patch import (
    ALLOWED_CHARACTER_PATCH_FIELDS,
    GM_COMBAT_PATCH_FIELDS,
    _clean_patch,
)

CAMPAIGN_FIELDS = ('campaign_id', 'campaign_name', 'campaign_join_status')


@pytest.mark.parametrize('field', CAMPAIGN_FIELDS)
def test_campaign_fields_are_not_in_the_patch_whitelist(field):
    assert field not in ALLOWED_CHARACTER_PATCH_FIELDS


@pytest.mark.parametrize('field', CAMPAIGN_FIELDS)
def test_clean_patch_drops_campaign_fields(field):
    cleaned = _clean_patch({field: 'victim-campaign-id', 'name': 'Alfi'})
    assert field not in cleaned
    # The rest of the payload must still be applied, so this is a targeted
    # exclusion rather than the whole patch being rejected.
    assert cleaned['name'] == 'Alfi'


def test_clean_patch_drops_all_campaign_fields_at_once():
    cleaned = _clean_patch({
        'campaign_id': 'victim-campaign-id',
        'campaign_name': 'Someone Else Campaign',
        'campaign_join_status': 'active',
        'current_hit_points': 7,
    })
    for field in CAMPAIGN_FIELDS:
        assert field not in cleaned
    assert cleaned['current_hit_points'] == 7


def test_a_campaign_only_payload_yields_no_writable_fields():
    # _clean_patch stamps updated_at, so assert no campaign field survives
    # rather than that the dict is empty.
    cleaned = _clean_patch({'campaign_id': 'victim-campaign-id'})
    assert not any(field in cleaned for field in CAMPAIGN_FIELDS)


@pytest.mark.parametrize('field', CAMPAIGN_FIELDS)
def test_gm_combat_patch_fields_also_exclude_campaign_fields(field):
    # The GM combat-edit path is narrower still; make sure the hole was not
    # simply relocated there.
    assert field not in GM_COMBAT_PATCH_FIELDS


def test_ordinary_sheet_fields_still_patchable():
    # Guard against an over-broad fix that breaks normal live-sheet saves.
    cleaned = _clean_patch({
        'current_hit_points': 12,
        'conditions': ['poisoned'],
        'inventory': [{'name': 'Rope'}],
        'spell_slots_remaining': {'1': 2},
    })
    assert cleaned['current_hit_points'] == 12
    assert cleaned['conditions'] == ['poisoned']
    assert cleaned['spell_slots_remaining'] == {'1': 2}
    # _clean_patch normalises inventory rows (adding equipped/is_equipped
    # defaults), so assert the item survives rather than exact equality.
    assert [item['name'] for item in cleaned['inventory']] == ['Rope']
