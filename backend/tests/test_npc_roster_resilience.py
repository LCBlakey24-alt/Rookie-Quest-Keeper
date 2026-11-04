"""One malformed NPC must not hide a campaign's whole roster.

Reported from a live campaign: the GM Home tile read "NPCs 32" while the NPC
tab showed "NPCs could not be loaded". Both read the same collection. Home
goes through /campaigns/{id}/home-bootstrap, which returns raw documents, so
it counted all 32. The tab goes through /campaigns/{id}/npcs, which was
declared response_model=List[NPC], so one record whose stored shape had
drifted made FastAPI refuse the entire list.

These tests pin the behaviour rather than the plumbing: the roster survives,
the good records are untouched, and a repaired one says that it was repaired.
"""

import os
import re
import sys
from typing import List

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import NPC  # noqa: E402
from utils.resilient_records import (  # noqa: E402
    REPAIR_FIELDS,
    REPAIR_FLAG,
    serialise_record,
    serialise_records,
)

CAMPAIGN = 'camp-1'
REQUIRED = {'campaign_id': CAMPAIGN, 'name': 'Unnamed NPC'}


def good(name='Kestra', **extra):
    return {'id': name.lower(), 'campaign_id': CAMPAIGN, 'name': name,
            'hp': 22, 'max_hp': 22, 'ac': 15, **extra}


# --- the shapes that used to take the roster down -------------------------

@pytest.mark.parametrize('field,stored', [
    ('ac', None),                                  # an importer writing nulls
    ('hp', '41 (6d8+12)'),                         # copied from a stat block
    ('level', '5th'),
    ('cr', 0.25),                                  # a number where text was wanted
    ('speed', 30),
    ('actions', 'Multiattack: two scimitars.'),    # prose where a list was wanted
    ('saving_throws', {'dex': 5}),
])
def test_a_drifted_field_still_yields_a_record(field, stored):
    record = serialise_record(NPC, good(**{field: stored}), REQUIRED)
    assert record['name'] == 'Kestra'
    assert record[REPAIR_FLAG] is True
    assert field in record[REPAIR_FIELDS]


def test_a_yes_is_already_a_boolean_and_needs_no_repair():
    # Pydantic reads 'yes' as True by itself, so this is not drift and the
    # record must not be flagged as if it were.
    record = serialise_record(NPC, good(combat_ready='yes'), REQUIRED)
    assert record['combat_ready'] is True
    assert REPAIR_FLAG not in record


def test_a_number_the_stat_block_leads_with_is_kept():
    # "41 (6d8+12)" says 41 hit points; that is reading the record, not guessing.
    assert serialise_record(NPC, good(hp='41 (6d8+12)'), REQUIRED)['hp'] == 41


def test_an_unreadable_number_falls_back_to_the_model_default():
    # "about a dozen" is not a hit point total, so no statistic is invented.
    record = serialise_record(NPC, good(hp='about a dozen'), REQUIRED)
    assert record['hp'] == NPC.model_fields['hp'].default
    assert 'hp' in record[REPAIR_FIELDS]


def test_a_dropped_list_becomes_empty_not_fabricated():
    record = serialise_record(NPC, good(actions='Multiattack.'), REQUIRED)
    assert record['actions'] == []


# --- the roster as a whole ------------------------------------------------

def test_one_bad_record_among_thirty_one_good_ones():
    roster = [good(f'NPC {index}') for index in range(31)]
    roster.append({'id': 'bad', 'campaign_id': CAMPAIGN, 'name': 'Jordan Crow', 'ac': None})
    records = serialise_records(NPC, roster, REQUIRED)
    assert len(records) == 32
    assert sum(1 for r in records if r.get(REPAIR_FLAG)) == 1


def test_a_valid_record_is_not_marked_or_altered():
    record = serialise_record(NPC, good(hp=41, ac=18), REQUIRED)
    assert REPAIR_FLAG not in record and REPAIR_FIELDS not in record
    assert (record['hp'], record['ac']) == (41, 18)


def test_enriched_gm_fields_are_preserved():
    # The model allows extras so stat-block provenance survives the round trip.
    record = serialise_record(NPC, good(gm_secret='Works for the Guild', ac=None), REQUIRED)
    assert record['gm_secret'] == 'Works for the Guild'


def test_a_nameless_record_is_visible_rather_than_missing():
    record = serialise_record(NPC, {'id': 'x', 'campaign_id': CAMPAIGN}, REQUIRED)
    assert record['name'] == 'Unnamed NPC'


def test_the_stored_document_is_never_mutated():
    stored = good(ac=None)
    before = dict(stored)
    serialise_record(NPC, stored, REQUIRED)
    assert stored == before


def test_repairing_twice_gives_the_same_answer():
    once = serialise_record(NPC, good(hp='41 (6d8+12)', ac=None), REQUIRED)
    twice = serialise_record(NPC, dict(once), REQUIRED)
    assert twice['hp'] == once['hp'] and twice['ac'] == once['ac']


def test_an_empty_campaign_is_still_an_empty_list():
    assert serialise_records(NPC, []) == []
    assert serialise_records(NPC, None) == []


# --- through FastAPI, which is where the 500 actually came from -----------

def _roster_with_one_bad_record():
    roster = [good(f'NPC {index}') for index in range(31)]
    roster.append({'id': 'bad', 'campaign_id': CAMPAIGN, 'name': 'Jordan Crow', 'ac': None})
    return roster


def test_the_old_contract_really_did_return_five_hundred():
    """Without this the fix cannot be shown to fix anything."""
    app = FastAPI()

    @app.get('/npcs', response_model=List[NPC])
    async def listing():
        return _roster_with_one_bad_record()

    response = TestClient(app, raise_server_exceptions=False).get('/npcs')
    assert response.status_code == 500


def test_the_new_contract_serves_every_record():
    app = FastAPI()

    @app.get('/npcs')
    async def listing():
        return serialise_records(NPC, _roster_with_one_bad_record(), REQUIRED)

    response = TestClient(app).get('/npcs')
    assert response.status_code == 200
    assert len(response.json()) == 32


# --- the route is actually wired to it ------------------------------------

def _route_source():
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(os.path.dirname(here), 'routes', 'npcs.py')
    with open(path, encoding='utf-8') as handle:
        return handle.read()


def test_the_npc_listing_no_longer_validates_the_whole_list():
    # Read the source rather than importing it: routes/__init__.py pulls in
    # every router, and with it every optional dependency.
    source = _route_source()
    listing = re.search(
        r'@router\.get\("/campaigns/\{campaign_id\}/npcs"[^)]*\)\s*\n'
        r'async def get_npcs.*?(?=\n@router\.)', source, re.S)
    assert listing, 'could not find the NPC listing route'
    assert 'response_model=List[NPC]' not in listing.group(0)
    assert 'serialise_records' in listing.group(0)
