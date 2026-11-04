"""No single bad record may hide a whole campaign collection.

#740 fixed this for NPCs, where a GM saw "NPCs could not be loaded" while all
32 of them sat in the database. Every other campaign list endpoint carried the
same response_model=List[...] contract, so the same stored drift -- a null
where a number belongs, prose where a list belongs -- would hide a campaign's
places, notes, maps, encounters, tables, deities, calendar or, worst of all,
the campaign list itself.

These tests are about what the GM can see, not about plumbing: the collection
survives one unreadable row, the good rows are unchanged, and nothing is
written back to the database.
"""

import os
import re
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

from models import (  # noqa: E402
    Campaign, CalendarEvent, CombatScenario, GameMap, God, InGameNote,
    Location, Player,
)
from utils.resilient_records import REPAIR_FLAG, serialise_records  # noqa: E402

CAMPAIGN = 'camp-1'
GM = 'lewis'

# model, the fields it cannot do without, and one field whose stored value has
# drifted in a way a campaign really does pick up from importers and pasting.
COLLECTIONS = [
    (Campaign, {'dm_user_id': GM, 'name': 'Untitled campaign'},
     {'dm_user_id': GM, 'name': 'Spilsby Wednesday'}, 'max_character_level', None),
    (Location, {'campaign_id': CAMPAIGN, 'name': 'Unnamed place'},
     {'campaign_id': CAMPAIGN, 'name': 'Balderin'}, 'places_of_interest', 'The old mill, the docks'),
    (InGameNote, {'campaign_id': CAMPAIGN, 'content': ''},
     {'campaign_id': CAMPAIGN, 'content': 'They met the harbourmaster.'}, 'content', None),
    (GameMap, {'campaign_id': CAMPAIGN, 'name': 'Untitled map'},
     {'campaign_id': CAMPAIGN, 'name': 'Harbour'}, 'width', None),
    (Player, {'campaign_id': CAMPAIGN, 'name': 'Unnamed player'},
     {'campaign_id': CAMPAIGN, 'name': 'Rina Ironside'}, 'level', '5th'),
    (CombatScenario, {'campaign_id': CAMPAIGN, 'name': 'Untitled encounter'},
     {'campaign_id': CAMPAIGN, 'name': 'Dock ambush'}, 'combatants', 'three bandits'),
    (God, {'campaign_id': CAMPAIGN, 'name': 'Unnamed deity'},
     {'campaign_id': CAMPAIGN, 'name': 'The Tide Mother'}, 'domain', None),
    (CalendarEvent, {'campaign_id': CAMPAIGN, 'name': 'Untitled event',
                     'day': 1, 'month': 1, 'year': 1},
     {'campaign_id': CAMPAIGN, 'name': 'Harvest fair', 'day': 4, 'month': 9, 'year': 1491},
     'day', None),
]

IDS = [spec[0].__name__ for spec in COLLECTIONS]


@pytest.mark.parametrize('model,required,good,field,drifted', COLLECTIONS, ids=IDS)
def test_one_unreadable_row_does_not_hide_the_collection(model, required, good, field, drifted):
    rows = [dict(good, id=f'row-{index}') for index in range(5)]
    rows.append(dict(good, id='drifted', **{field: drifted}))
    records = serialise_records(model, rows, required)
    assert len(records) == 6, 'every row must still reach the GM'
    assert sum(1 for r in records if r.get(REPAIR_FLAG)) == 1


@pytest.mark.parametrize('model,required,good,field,drifted', COLLECTIONS, ids=IDS)
def test_a_good_row_is_neither_flagged_nor_altered(model, required, good, field, drifted):
    [record] = serialise_records(model, [dict(good, id='fine')], required)
    assert REPAIR_FLAG not in record
    for key, value in good.items():
        assert record[key] == value


@pytest.mark.parametrize('model,required,good,field,drifted', COLLECTIONS, ids=IDS)
def test_the_stored_row_is_never_written_back(model, required, good, field, drifted):
    stored = dict(good, id='drifted', **{field: drifted})
    before = dict(stored)
    serialise_records(model, [stored], required)
    assert stored == before


@pytest.mark.parametrize('model,required,good,field,drifted', COLLECTIONS, ids=IDS)
def test_the_old_contract_really_did_lose_the_lot(model, required, good, field, drifted):
    """Without this the change cannot be shown to change anything."""
    from typing import List

    rows = [dict(good, id=f'row-{index}') for index in range(5)]
    rows.append(dict(good, id='drifted', **{field: drifted}))

    app = FastAPI()

    @app.get('/listing', response_model=List[model])
    async def listing():
        return rows

    response = TestClient(app, raise_server_exceptions=False).get('/listing')
    assert response.status_code == 500, (
        f'{model.__name__}: a {field} of {drifted!r} no longer breaks the old '
        'contract, so this row is not testing what it claims to'
    )


def test_an_empty_collection_stays_empty():
    assert serialise_records(Location, [], {'campaign_id': CAMPAIGN, 'name': 'x'}) == []


# --- the routes are actually wired to it ----------------------------------

ROUTES = [
    ('campaigns.py', '/campaigns', 'Campaign'),
    ('combat.py', '/campaigns/{campaign_id}/combat-scenarios', 'CombatScenario'),
    ('maps.py', '/campaigns/{campaign_id}/maps', 'GameMap'),
    ('notes.py', '/campaigns/{campaign_id}/ingame-notes', 'InGameNote'),
    ('players.py', '/campaigns/{campaign_id}/players', 'Player'),
    ('tables.py', '/campaigns/{campaign_id}/tables', 'CampaignTable'),
    ('tables.py', '/campaigns/{campaign_id}/player-safe-tables', 'CampaignTable'),
    ('world.py', '/campaigns/{campaign_id}/gods', 'God'),
    ('world.py', '/campaigns/{campaign_id}/calendar-events', 'CalendarEvent'),
    ('world.py', '/campaigns/{campaign_id}/locations', 'Location'),
    ('npcs.py', '/campaigns/{campaign_id}/npcs', 'NPC'),
]


def _source(filename):
    """Route source with comments stripped.

    A guard in this repo has more than once passed on its own explanatory
    comment rather than on the code, so the comments go before any assertion.
    """
    with open(os.path.join(BACKEND, 'routes', filename), encoding='utf-8') as handle:
        text = handle.read()
    return re.sub(r'^\s*#.*$', '', text, flags=re.M)


@pytest.mark.parametrize('filename,route,model', ROUTES,
                         ids=[f'{r[2]}:{r[1]}' for r in ROUTES])
def test_no_listing_validates_the_whole_collection(filename, route, model):
    source = _source(filename)
    assert f'response_model=List[{model}]' not in source
    pattern = re.escape(f'@router.get("{route}")')
    assert re.search(pattern, source), f'{filename}: {route} listing not found'


@pytest.mark.parametrize('filename', sorted({r[0] for r in ROUTES}))
def test_each_touched_route_file_imports_the_helper(filename):
    assert 'from utils.resilient_records import serialise_records' in _source(filename)
