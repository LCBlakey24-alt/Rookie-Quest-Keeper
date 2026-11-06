"""The note world-sync endpoint must not change a campaign on its own.

A bare POST to /campaigns/{id}/ingame-notes/{note_id}/sync used to apply every
change the deterministic parser inferred: a player character's hit points to
zero with a "dead" condition, an NPC relocated, a brand new location inserted.
Any authenticated campaign owner could reach it, and the Live Play note box
was one wiring change away from calling it on every save.

Rook and deterministic detection suggest; the GM decides. A plain POST now
previews, and applying requires apply=true together with the explicit
proposal ids being approved.
"""

import asyncio
import importlib.util
import os
import sys

# config.py refuses to import without these; the same values the other route
# suites use. Nothing here touches a real database.
for _key, _value in {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'test',
    'JWT_SECRET_KEY': 'test',
    'APP_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
}.items():
    os.environ.setdefault(_key, _value)

import pytest
from fastapi import HTTPException

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)
sys.path.insert(0, os.path.join(BACKEND, 'tests'))

from test_session_note_sync import FakeCollection, FakeDb  # noqa: E402


async def _find_one(self, query, projection=None):
    """The route looks the note up directly; the shared fake only has find()."""
    for doc in self.docs:
        if all(doc.get(key) == value for key, value in query.items()):
            return {key: value for key, value in doc.items() if key != '_id'}
    return None


FakeCollection.find_one = _find_one


def load_notes_route():
    """Load the route file directly rather than importing every router."""
    spec = importlib.util.spec_from_file_location(
        'notes_route_under_test', os.path.join(BACKEND, 'routes', 'notes.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


notes = load_notes_route()


def run(coro):
    # asyncio.run, not get_event_loop(): the latter raises "no current event
    # loop" once any earlier test in the session has closed one, so these
    # passed alone and failed in the full suite.
    return asyncio.run(coro)


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb("Rina died when the bridge collapsed. Bran has chosen to move to Moonfall.")
    fake.player_characters.docs[0].update({"name": "Rina", "current_hit_points": 41, "conditions": []})
    monkeypatch.setattr(notes, 'db', fake)
    monkeypatch.setattr(notes.session_sync_module if hasattr(notes, 'session_sync_module') else notes,
                        'db', fake, raising=False)
    # Ownership is checked by the route; allow it and test refusal separately.
    async def allow(campaign_id, username):
        return None
    monkeypatch.setattr(notes, 'verify_campaign_ownership', allow)
    return fake


def call(payload=None, campaign='camp-1', note_id='note-1', user='gm'):
    return run(notes.sync_ingame_note_world_state(campaign, note_id, payload, user))


def test_a_bare_post_previews_and_changes_nothing(db):
    before = dict(db.player_characters.docs[0])

    result = call()

    assert result['preview'] is True
    assert result['applied_updates'] == []
    assert db.player_characters.docs[0] == before
    assert db.locations.inserts == []
    assert db.npcs.updates == []


def test_the_preview_still_tells_the_gm_what_it_noticed(db):
    result = call()
    kinds = {item['type'] for item in result['proposals']}
    assert 'player_character_status' in kinds
    assert 'npc_location' in kinds
    assert all(item['id'] for item in result['proposals'])


def test_apply_without_approved_ids_is_refused(db):
    before = dict(db.player_characters.docs[0])

    with pytest.raises(HTTPException) as caught:
        call({'apply': True})

    assert caught.value.status_code == 400
    assert db.player_characters.docs[0] == before


def test_apply_with_an_empty_approval_list_is_refused(db):
    with pytest.raises(HTTPException) as caught:
        call({'apply': True, 'approved_ids': []})
    assert caught.value.status_code == 400


def test_an_approved_proposal_applies_only_itself(db):
    death = next(item for item in call()['proposals']
                 if item['type'] == 'player_character_status')

    result = call({'apply': True, 'approved_ids': [death['id']]})

    assert [item['type'] for item in result['applied_updates']] == ['player_character_status']
    assert db.player_characters.docs[0]['current_hit_points'] == 0
    # The NPC move was proposed in the same note but not approved.
    assert db.locations.inserts == []
    assert db.npcs.docs[0]['location'] == 'Old Road'


def test_repeating_an_approved_apply_does_not_mutate_twice(db):
    death = next(item for item in call()['proposals']
                 if item['type'] == 'player_character_status')
    call({'apply': True, 'approved_ids': [death['id']]})
    writes = len(db.player_characters.updates)

    second = call({'apply': True, 'approved_ids': [death['id']]})

    assert second['applied_updates'] == []
    assert second['skipped_already_applied'] == [death['id']]
    assert len(db.player_characters.updates) == writes


def test_a_user_who_does_not_own_the_campaign_cannot_preview_or_apply(db, monkeypatch):
    async def refuse(campaign_id, username):
        raise HTTPException(status_code=404, detail='Campaign not found or access denied')
    monkeypatch.setattr(notes, 'verify_campaign_ownership', refuse)
    before = dict(db.player_characters.docs[0])

    for payload in (None, {'apply': True, 'approved_ids': ['anything']}):
        with pytest.raises(HTTPException) as caught:
            call(payload)
        assert caught.value.status_code == 404

    assert db.player_characters.docs[0] == before
    assert db.locations.inserts == []


def test_a_missing_note_is_a_404_and_changes_nothing(db):
    before = dict(db.player_characters.docs[0])
    with pytest.raises(HTTPException) as caught:
        call(note_id='no-such-note')
    assert caught.value.status_code == 404
    assert db.player_characters.docs[0] == before
