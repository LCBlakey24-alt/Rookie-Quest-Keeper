"""Roll events: who rolled is decided by the server, and each roll counts once.

Synthetic accounts and campaigns only, held in memory. Nothing here talks to a
real database.

The cast:
  gm        runs campaign A
  player-a  in campaign A with Aria (char-a)
  player-b  in campaign A with a different Aria (char-b), same name on purpose
  outsider  in no campaign; has a character in campaign B
  Player A also owns char-a-elsewhere (campaign B) and char-a-left (unlinked).
"""
import asyncio
import copy
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

import httpx  # noqa: E402
from fastapi import FastAPI, Header  # noqa: E402
from pymongo.errors import DuplicateKeyError  # noqa: E402

import utils.auth as auth_module  # noqa: E402
from utils.player_display_payload import sanitize_player_display_payload  # noqa: E402

spec = importlib.util.spec_from_file_location('roll_events_under_test', BACKEND_ROOT / 'routes' / 'roll_events.py')
roll_events = importlib.util.module_from_spec(spec)
spec.loader.exec_module(roll_events)

CAMPAIGN = 'camp-a'
OTHER_CAMPAIGN = 'camp-b'
CHECK_ID = 'group-check-123-abcdef'


# --------------------------------------------------------------------------
# A small in-memory stand-in for the Mongo collections these routes touch.
# Every read yields to the event loop first, so concurrent calls really do
# interleave between their read and their write.
# --------------------------------------------------------------------------

def _matches(doc, query):
    for key, expected in query.items():
        actual = doc.get(key)
        if isinstance(expected, dict) and any(str(op).startswith('$') for op in expected):
            for op, value in expected.items():
                if op == '$in' and actual not in value:
                    return False
                if op == '$ne' and actual == value:
                    return False
        elif expected is None:
            if actual is not None:
                return False
        elif actual != expected:
            return False
    return True


def _project(doc, projection):
    out = copy.deepcopy(doc)
    out.pop('_id', None)
    if projection:
        wanted = [key for key, on in projection.items() if on and key != '_id']
        if wanted:
            out = {key: out[key] for key in wanted if key in out}
    return out


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, key, direction=1):
        self.docs.sort(key=lambda doc: str(doc.get(key) or ''), reverse=direction == -1)
        return self

    async def to_list(self, limit):
        return self.docs[:limit]


class Collection:
    def __init__(self, docs=None, unique=None):
        self.docs = [copy.deepcopy(doc) for doc in docs or []]
        self.unique = unique  # fields that, when all present, must be unique

    async def find_one(self, query, projection=None):
        await asyncio.sleep(0)
        for doc in self.docs:
            if _matches(doc, query):
                return _project(doc, projection)
        return None

    def find(self, query, projection=None):
        return Cursor([_project(doc, projection) for doc in self.docs if _matches(doc, query)])

    async def insert_one(self, doc):
        await asyncio.sleep(0)
        if self.unique and all(isinstance(doc.get(field), str) for field in self.unique):
            for existing in self.docs:
                if all(existing.get(field) == doc.get(field) for field in self.unique):
                    raise DuplicateKeyError('duplicate key')
        doc['_id'] = object()
        self.docs.append(copy.deepcopy(doc))
        return SimpleNamespace(inserted_id=doc['_id'])

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(copy.deepcopy(update.get('$set', {})))
                return SimpleNamespace(matched_count=1, modified_count=1)
        return SimpleNamespace(matched_count=0, modified_count=0)

    async def update_many(self, query, update):
        count = 0
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(copy.deepcopy(update.get('$set', {})))
                count += 1
        return SimpleNamespace(modified_count=count)


def group_check_state(party_ids=('char-a', 'char-b'), **payload):
    return {
        'campaign_id': CAMPAIGN,
        'sync_id': 'sync-1',
        'sequence': 1,
        'mode': 'group-check',
        'updated_at': '2026-01-01T00:00:00+00:00',
        'updated_by': 'gm',
        'payload': {
            'id': CHECK_ID,
            'group_check_id': CHECK_ID,
            'title': 'Stealth Check',
            'check_name': 'Stealth',
            'status': 'collecting',
            'party': [{'id': cid, 'name': 'Aria'} for cid in party_ids],
            'results': [],
            **payload,
        },
    }


class FakeDb:
    def __init__(self):
        self.campaigns = Collection([
            {'id': CAMPAIGN, 'name': 'Synthetic A', 'dm_user_id': 'gm'},
            {'id': OTHER_CAMPAIGN, 'name': 'Synthetic B', 'dm_user_id': 'gm-b'},
        ])
        self.campaign_members = Collection([
            {'campaign_id': CAMPAIGN, 'user_id': 'player-a', 'character_id': 'char-a', 'status': 'active'},
            {'campaign_id': CAMPAIGN, 'user_id': 'player-b', 'character_id': 'char-b', 'status': 'active'},
            {'campaign_id': OTHER_CAMPAIGN, 'user_id': 'player-a', 'character_id': 'char-a-elsewhere', 'status': 'active'},
            {'campaign_id': OTHER_CAMPAIGN, 'user_id': 'outsider', 'character_id': 'char-outsider', 'status': 'active'},
        ])
        self.player_characters = Collection([
            {'id': 'char-a', 'user_id': 'player-a', 'campaign_id': CAMPAIGN, 'name': 'Aria', 'current_hit_points': 12},
            {'id': 'char-b', 'user_id': 'player-b', 'campaign_id': CAMPAIGN, 'name': 'Aria', 'current_hit_points': 9},
            {'id': 'char-a-elsewhere', 'user_id': 'player-a', 'campaign_id': OTHER_CAMPAIGN, 'name': 'Bram'},
            {'id': 'char-a-left', 'user_id': 'player-a', 'campaign_id': '', 'name': 'Cass'},
            {'id': 'char-outsider', 'user_id': 'outsider', 'campaign_id': OTHER_CAMPAIGN, 'name': 'Dax'},
            {'id': 'char-gm', 'user_id': 'gm', 'campaign_id': CAMPAIGN, 'name': 'GM Sidekick'},
        ])
        self.roll_events = Collection(unique=('campaign_id', 'user_id', 'client_event_id'))
        self.roll_session_summaries = Collection()
        self.campaign_display_states = Collection([group_check_state()])
        self.combat_sessions = Collection([{'id': 'combat-1', 'campaign_id': CAMPAIGN, 'round': 2}])


class Broadcasts:
    def __init__(self):
        self.sent = []

    async def broadcast_to_campaign(self, campaign_id, message):
        self.sent.append((campaign_id, copy.deepcopy(message)))


@pytest.fixture
def env(monkeypatch):
    fake = FakeDb()
    broadcasts = Broadcasts()
    monkeypatch.setattr(roll_events, 'db', fake)
    monkeypatch.setattr(auth_module, 'db', fake)
    monkeypatch.setattr(roll_events, 'ws_manager', broadcasts)

    app = FastAPI()
    app.include_router(roll_events.router)

    async def current_user(x_test_user: str = Header(...)):
        return x_test_user

    app.dependency_overrides[roll_events.get_current_user] = current_user
    return SimpleNamespace(db=fake, broadcasts=broadcasts, app=app)


def run(coro):
    return asyncio.run(coro)


async def post(env, user, body, campaign=CAMPAIGN, **kwargs):
    transport = httpx.ASGITransport(app=env.app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        return await client.post(f'/campaigns/{campaign}/roll-events', json=body, headers={'x-test-user': user}, **kwargs)


def player_roll(character_id='char-a', d20=14, modifier=3, **extra):
    return {
        'actor_type': 'player',
        'character_id': character_id,
        'label': 'Stealth',
        'notation': '1d20+3',
        'total': d20 + modifier,
        'modifier': modifier,
        'rolls': [{'sides': 20, 'result': d20}],
        **extra,
    }


def stored(env):
    return [doc for doc in env.db.roll_events.docs]


def group_payload(env):
    return env.db.campaign_display_states.docs[0]['payload']


# --------------------------------------------------------------------------
# 1-6: identity
# --------------------------------------------------------------------------

def test_player_rolls_for_their_own_character(env):
    response = run(post(env, 'player-a', player_roll()))
    assert response.status_code == 200, response.text
    event = response.json()
    assert event['user_id'] == 'player-a'
    assert event['character_id'] == 'char-a'
    assert event['actor_type'] == 'player'
    assert len(stored(env)) == 1


def test_names_and_actor_come_from_the_saved_character_not_the_request(env):
    response = run(post(env, 'player-a', player_roll(actor='The GM', character_name='Someone Else')))
    event = response.json()
    assert event['actor'] == 'Aria'
    assert event['character_name'] == 'Aria'


def test_player_cannot_roll_as_another_players_character(env):
    response = run(post(env, 'player-a', player_roll(character_id='char-b')))
    assert response.status_code == 403
    assert stored(env) == []


@pytest.mark.parametrize('body', [
    {'actor_type': 'gm', 'actor': 'GM / Table', 'label': 'Secret', 'total': 7, 'rolls': [{'sides': 20, 'result': 7}]},
    {'actor_type': 'gm', 'character_id': 'char-a', 'total': 7, 'rolls': [{'sides': 20, 'result': 7}]},
])
def test_player_cannot_record_a_gm_roll(env, body):
    response = run(post(env, 'player-a', body))
    assert response.status_code == 403
    assert stored(env) == []


def test_unknown_actor_types_are_refused(env):
    response = run(post(env, 'player-a', player_roll(actor_type='admin')))
    assert response.status_code == 422
    assert stored(env) == []


@pytest.mark.parametrize('character_id', ['char-a-elsewhere', 'char-outsider'])
def test_characters_from_another_campaign_are_refused(env, character_id):
    response = run(post(env, 'player-a', player_roll(character_id=character_id)))
    assert response.status_code == 403
    assert stored(env) == []


def test_a_character_no_longer_linked_to_the_campaign_is_refused(env):
    response = run(post(env, 'player-a', player_roll(character_id='char-a-left')))
    assert response.status_code == 403


def test_a_player_roll_without_a_character_is_refused(env):
    response = run(post(env, 'player-a', player_roll(character_id='')))
    assert response.status_code == 422


def test_someone_outside_the_campaign_cannot_roll_in_it(env):
    response = run(post(env, 'outsider', player_roll(character_id='char-outsider')))
    assert response.status_code == 403
    assert stored(env) == []


def test_a_removed_member_cannot_roll(env):
    env.db.campaign_members.docs[0]['status'] = 'removed'
    response = run(post(env, 'player-a', player_roll()))
    assert response.status_code == 403


def test_two_characters_with_the_same_name_stay_separate(env):
    first = run(post(env, 'player-a', player_roll('char-a', d20=5, client_event_id='evt-a-00000001', group_check_id=CHECK_ID)))
    second = run(post(env, 'player-b', player_roll('char-b', d20=18, client_event_id='evt-b-00000001', group_check_id=CHECK_ID)))
    assert first.status_code == second.status_code == 200
    events = stored(env)
    assert {(event['user_id'], event['character_id']) for event in events} == {('player-a', 'char-a'), ('player-b', 'char-b')}
    results = {result['character_id']: result['total'] for result in group_payload(env)['results']}
    assert results == {'char-a': 8, 'char-b': 21}


# --------------------------------------------------------------------------
# 7, 12: one action, one roll
# --------------------------------------------------------------------------

def test_a_retried_request_returns_the_same_roll_and_records_it_once(env):
    body = player_roll(client_event_id='evt-retry-0001', group_check_id=CHECK_ID)
    first = run(post(env, 'player-a', body))
    again = run(post(env, 'player-a', body))
    assert first.status_code == again.status_code == 200
    assert again.json()['id'] == first.json()['id']
    assert again.json()['duplicate'] is True
    assert len(stored(env)) == 1
    assert len(group_payload(env)['results']) == 1


def test_simultaneous_retries_of_one_roll_record_it_once(env):
    body = player_roll(client_event_id='evt-race-0001')

    async def burst():
        return await asyncio.gather(*(post(env, 'player-a', body) for _ in range(6)))

    responses = run(burst())
    assert all(response.status_code == 200 for response in responses)
    assert len({response.json()['id'] for response in responses}) == 1
    assert len(stored(env)) == 1


def test_older_clients_event_id_is_used_as_the_key(env):
    body = player_roll(id='roll-1700000000000-abcde')
    run(post(env, 'player-a', body))
    run(post(env, 'player-a', body))
    assert len(stored(env)) == 1


def test_the_same_event_id_from_two_accounts_is_two_rolls(env):
    run(post(env, 'player-a', player_roll('char-a', client_event_id='evt-shared-0001')))
    run(post(env, 'player-b', player_roll('char-b', client_event_id='evt-shared-0001')))
    assert len(stored(env)) == 2


def test_rolls_without_an_event_id_are_each_recorded(env):
    run(post(env, 'player-a', player_roll()))
    run(post(env, 'player-a', player_roll()))
    assert len(stored(env)) == 2
    assert all('client_event_id' not in event for event in stored(env))


def test_a_malformed_event_id_is_refused(env):
    response = run(post(env, 'player-a', player_roll(client_event_id='bad id!')))
    assert response.status_code == 422


# --------------------------------------------------------------------------
# 8, 9: group checks
# --------------------------------------------------------------------------

def test_a_roll_joins_the_group_check_it_names(env):
    run(post(env, 'player-a', player_roll(group_check_id=CHECK_ID)))
    payload = group_payload(env)
    assert [result['character_id'] for result in payload['results']] == ['char-a']
    assert payload['status'] == 'collecting'


def test_the_check_completes_only_when_every_requested_character_has_rolled(env):
    run(post(env, 'player-a', player_roll('char-a', group_check_id=CHECK_ID)))
    assert group_payload(env)['status'] == 'collecting'
    run(post(env, 'player-b', player_roll('char-b', group_check_id=CHECK_ID)))
    assert group_payload(env)['status'] == 'complete'
    # A retry or reroll after completion keeps it complete and correct.
    run(post(env, 'player-b', player_roll('char-b', d20=2, group_check_id=CHECK_ID)))
    payload = group_payload(env)
    assert payload['status'] == 'complete'
    assert {result['character_id']: result['total'] for result in payload['results']} == {'char-a': 17, 'char-b': 5}


def test_simultaneous_rolls_from_different_players_are_all_kept(env):
    async def together():
        return await asyncio.gather(
            post(env, 'player-a', player_roll('char-a', d20=11, group_check_id=CHECK_ID)),
            post(env, 'player-b', player_roll('char-b', d20=19, group_check_id=CHECK_ID)),
        )

    responses = run(together())
    assert all(response.status_code == 200 for response in responses)
    payload = group_payload(env)
    assert sorted(result['character_id'] for result in payload['results']) == ['char-a', 'char-b']
    assert payload['status'] == 'complete'


def test_one_players_roll_never_overwrites_another_characters_result(env):
    run(post(env, 'player-b', player_roll('char-b', d20=20, group_check_id=CHECK_ID)))
    run(post(env, 'player-a', player_roll('char-a', d20=1, group_check_id=CHECK_ID)))
    totals = {result['character_id']: result['total'] for result in group_payload(env)['results']}
    assert totals == {'char-a': 4, 'char-b': 23}


def test_an_older_roll_arriving_late_does_not_replace_a_newer_one(env):
    newer = {'id': 'roll-newer', 'character_id': 'char-a', 'total': 20, 'created_at': '2999-01-01T00:00:00+00:00'}
    env.db.campaign_display_states.docs[0]['payload']['results'] = [newer]
    run(post(env, 'player-a', player_roll('char-a', d20=3, group_check_id=CHECK_ID)))
    assert group_payload(env)['results'] == [newer]


def test_a_character_not_asked_to_roll_cannot_join_the_check(env):
    env.db.campaign_display_states.docs[0] = group_check_state(party_ids=('char-b',))
    response = run(post(env, 'player-a', player_roll('char-a', group_check_id=CHECK_ID)))
    assert response.status_code == 200  # the roll itself is still the player's to record
    assert group_payload(env)['results'] == []


def test_a_roll_naming_a_different_or_closed_check_changes_nothing(env):
    run(post(env, 'player-a', player_roll(group_check_id='group-check-other')))
    assert group_payload(env)['results'] == []
    env.db.campaign_display_states.docs[0]['payload']['status'] = 'closed'
    run(post(env, 'player-a', player_roll(group_check_id=CHECK_ID)))
    assert group_payload(env)['results'] == []


def test_a_roll_never_overwrites_a_newer_display_the_gm_put_up(env):
    """The GM replaces the group check while a roll is being merged."""
    original = env.db.campaign_display_states.find_one
    swapped = {'done': False}

    async def gm_swaps_screen_after_the_read(query, projection=None):
        state = await original(query, projection)
        if not swapped['done']:
            swapped['done'] = True
            env.db.campaign_display_states.docs[0] = {
                'campaign_id': CAMPAIGN, 'sync_id': 'sync-2', 'mode': 'title',
                'updated_at': '2026-01-01T00:00:05+00:00', 'payload': {'title': 'The Gate Opens'},
            }
        return state

    env.db.campaign_display_states.find_one = gm_swaps_screen_after_the_read
    run(post(env, 'player-a', player_roll(group_check_id=CHECK_ID)))
    state = env.db.campaign_display_states.docs[0]
    assert state['mode'] == 'title'
    assert state['payload'] == {'title': 'The Gate Opens'}
    assert env.broadcasts.sent == []


def test_the_group_check_broadcast_is_the_member_safe_view(env):
    env.db.campaign_display_states.docs[0]['payload']['gm_notes'] = 'The butler did it'
    run(post(env, 'player-a', player_roll(group_check_id=CHECK_ID)))
    assert len(env.broadcasts.sent) == 1
    campaign_id, message = env.broadcasts.sent[0]
    assert campaign_id == CAMPAIGN
    assert 'gm_notes' not in message['data']['payload']
    assert message['user_id'] == ''
    for result in message['data']['payload']['results']:
        assert 'user_id' not in result


def test_the_check_id_survives_the_player_display_allowlist(env):
    """Without it no player's device can say which check its roll answers."""
    safe = sanitize_player_display_payload('group-check', group_check_state()['payload'])
    assert safe['group_check_id'] == CHECK_ID
    assert safe['id'] == CHECK_ID
    assert safe['status'] == 'collecting'


# --------------------------------------------------------------------------
# 10: payload validation
# --------------------------------------------------------------------------

@pytest.mark.parametrize('change', [
    {'rolls': [{'sides': 20, 'result': 21}]},
    {'rolls': [{'sides': 20, 'result': 0}]},
    {'rolls': [{'sides': 1000, 'result': 5}]},
    {'rolls': [{'sides': 'twenty', 'result': 5}]},
    {'rolls': [{'sides': 6, 'result': 3, 'sign': 5}]},
    {'rolls': 'twenty'},
    {'rolls': [{'sides': 6, 'result': 1}] * 501},
    {'total': 10 ** 12},
    {'modifier': -(10 ** 9)},
    {'label': 'x' * 201},
    {'notation': 'd' * 201},
    {'explosionCount': -1},
])
def test_malformed_rolls_are_refused(env, change):
    response = run(post(env, 'player-a', {**player_roll(), **change}))
    assert response.status_code == 422, response.text
    assert stored(env) == []


def test_oversized_bodies_are_refused_before_parsing(env):
    body = {**player_roll(), 'padding': 'x' * (roll_events.MAX_BODY_BYTES + 1)}
    response = run(post(env, 'player-a', body))
    assert response.status_code == 413
    assert stored(env) == []


def test_a_non_object_body_is_refused(env):
    response = run(post(env, 'player-a', ['not', 'a', 'roll']))
    assert response.status_code == 422


def test_control_characters_in_text_are_neutralised(env):
    event = run(post(env, 'player-a', player_roll(label='Stealth\u0000\u001b[31m'))).json()
    assert '\u0000' not in event['label'] and '\u001b' not in event['label']


def test_shown_dice_are_derived_from_the_rolled_dice(env):
    body = player_roll(d20=17, modifier=2, rolls=[
        {'sides': 20, 'result': 17}, {'sides': 20, 'result': 4, 'dropped': True},
    ], visibleRolls=[{'sides': 20, 'result': 20}])
    body['total'] = 19
    event = run(post(env, 'player-a', body)).json()
    assert event['visibleRolls'] == [{'sides': 20, 'result': 17, 'sign': 1, 'dropped': False, 'exploded': False}]
    assert event['total_check'] == 'consistent'


def test_a_total_the_dice_do_not_explain_is_marked_unverified_not_trusted(env):
    event = run(post(env, 'player-a', {**player_roll(d20=3, modifier=0), 'total': 30})).json()
    assert event['total_check'] == 'unverified'
    assert event['total'] == 30  # recorded as the client's claim, not silently corrected


def test_a_physical_roll_logged_by_hand_is_consistent(env):
    body = player_roll(d20=12, modifier=5, notation='physical d20')
    assert run(post(env, 'player-a', body)).json()['total_check'] == 'consistent'


# --------------------------------------------------------------------------
# 11, 13: GM rolls
# --------------------------------------------------------------------------

def test_the_gm_can_record_a_table_roll_and_it_is_not_broadcast(env):
    body = {'actor_type': 'gm', 'actor': 'GM / Table', 'label': 'Secret ambush', 'notation': '1d20',
            'total': 9, 'rolls': [{'sides': 20, 'result': 9}], 'group_check_id': CHECK_ID}
    response = run(post(env, 'gm', body))
    assert response.status_code == 200
    event = response.json()
    assert event['actor_type'] == 'gm'
    assert event['character_id'] == ''
    assert event['group_check_id'] == ''
    assert env.broadcasts.sent == []
    assert group_payload(env)['results'] == []


def test_the_gm_rolling_from_their_own_sheet_is_a_character_roll(env):
    env.db.campaign_display_states.docs[0] = group_check_state(party_ids=('char-a', 'char-gm'))
    response = run(post(env, 'gm', player_roll('char-gm', group_check_id=CHECK_ID)))
    assert response.status_code == 200
    assert response.json()['actor'] == 'GM Sidekick'
    assert [result['character_id'] for result in group_payload(env)['results']] == ['char-gm']


def test_the_gm_cannot_attribute_a_roll_to_a_players_character(env):
    response = run(post(env, 'gm', player_roll('char-a')))
    assert response.status_code == 403


def test_a_gm_of_another_campaign_cannot_record_gm_rolls_here(env):
    response = run(post(env, 'gm-b', {'actor_type': 'gm', 'total': 1, 'rolls': [{'sides': 20, 'result': 1}]}))
    assert response.status_code == 403


def test_players_cannot_read_the_roll_summary(env):
    async def get_summary(user):
        transport = httpx.ASGITransport(app=env.app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            return await client.get(f'/campaigns/{CAMPAIGN}/roll-events/summary', headers={'x-test-user': user})

    run(post(env, 'gm', {'actor_type': 'gm', 'label': 'Secret', 'total': 4, 'rolls': [{'sides': 20, 'result': 4}]}))
    assert run(get_summary('player-a')).status_code == 404
    assert run(get_summary('gm')).status_code == 200


# --------------------------------------------------------------------------
# 14: nothing else changes
# --------------------------------------------------------------------------

def test_recording_rolls_changes_no_character_combat_or_campaign_data(env):
    before = copy.deepcopy((env.db.player_characters.docs, env.db.combat_sessions.docs,
                            env.db.campaigns.docs, env.db.campaign_members.docs))
    run(post(env, 'player-a', player_roll(group_check_id=CHECK_ID, client_event_id='evt-safe-0001')))
    run(post(env, 'player-a', player_roll(client_event_id='evt-safe-0001')))
    run(post(env, 'player-a', player_roll('char-b')))
    run(post(env, 'gm', {'actor_type': 'gm', 'total': 4, 'rolls': [{'sides': 20, 'result': 4}]}))
    after = (env.db.player_characters.docs, env.db.combat_sessions.docs,
             env.db.campaigns.docs, env.db.campaign_members.docs)
    assert after == before


def test_the_unique_index_is_partial_so_historic_rolls_are_untouched():
    calls = []

    class Recorder:
        async def create_index(self, keys, **options):
            calls.append((keys, options))

    run(roll_events.ensure_roll_event_indexes(SimpleNamespace(roll_events=Recorder())))
    unique = [options for keys, options in calls if options.get('unique')]
    assert unique == [{
        'unique': True, 'background': True, 'name': 'roll_event_client_id_unique',
        'partialFilterExpression': {'client_event_id': {'$type': 'string'}},
    }]


# --------------------------------------------------------------------------
# Player-facing end-session privacy: GM-only rolls must never leak via awards,
# top rolls, totals or leaderboards when no character submitted any dice.
# --------------------------------------------------------------------------

def test_end_session_summary_excludes_gm_only_rolls(env):
    secret_label = 'GM-ONLY hidden ambush plan'
    response = run(post(env, 'gm', {
        'actor_type': 'gm', 'label': secret_label, 'notation': '1d20',
        'total': 20, 'rolls': [{'sides': 20, 'result': 20}],
    }))
    assert response.status_code == 200

    summary = run(roll_events.build_summary(CAMPAIGN))
    for section in (summary['session'], summary['allTime']):
        assert section['playerRolls'] == 0
        assert section['gmRolls'] == 1
        assert section['totalRolls'] == 0
        assert section['totalDice'] == 0
        assert section['nat20s'] == 0
        assert section['nat1s'] == 0
        assert section['actors'] == []
        assert section['awards'] == []
        assert section['highestTotal'] is None
        assert section['biggestD20'] is None
        assert secret_label not in str(section)


def test_end_session_summary_counts_players_but_not_gm_dice(env):
    assert run(post(env, 'gm', {
        'actor_type': 'gm', 'label': 'GM-ONLY dungeon secret',
        'notation': '1d20', 'total': 20, 'rolls': [{'sides': 20, 'result': 20}],
    })).status_code == 200
    assert run(post(env, 'player-a', player_roll(d20=1, modifier=3))).status_code == 200

    summary = run(roll_events.build_summary(CAMPAIGN))
    for section in (summary['session'], summary['allTime']):
        assert section['playerRolls'] == 1
        assert section['gmRolls'] == 1
        assert section['totalRolls'] == 1
        assert section['nat20s'] == 0
        assert section['nat1s'] == 1
        assert section['totalDice'] == 1
        assert len(section['actors']) == 1
        assert section['actors'][0]['name'] == 'Aria'
        assert section['highestTotal']['total'] == 4
        assert 'GM-ONLY dungeon secret' not in str(section)
