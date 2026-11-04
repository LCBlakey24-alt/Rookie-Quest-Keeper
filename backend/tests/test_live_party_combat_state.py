import asyncio
import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace

sys.modules.setdefault('config', types.SimpleNamespace(db=None))
sys.modules.setdefault('utils', types.ModuleType('utils'))
sys.modules.setdefault('utils.auth', types.SimpleNamespace(get_current_user=lambda: None, verify_campaign_ownership=None))

util_spec = importlib.util.spec_from_file_location('live_party_utils_under_test', Path(__file__).resolve().parents[1] / 'utils' / 'live_party.py')
live_party_utils = importlib.util.module_from_spec(util_spec)
assert util_spec and util_spec.loader
util_spec.loader.exec_module(live_party_utils)
sys.modules['utils.live_party'] = live_party_utils

spec = importlib.util.spec_from_file_location('live_party_under_test', Path(__file__).resolve().parents[1] / 'routes' / 'live_party.py')
live_party = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(live_party)


def test_character_row_preserves_full_safe_combat_state():
    row = live_party_utils._character_row({
        'id': 'char-1',
        'name': 'Hero',
        'max_hit_points': 40,
        'current_hit_points': 17,
        'temporary_hit_points': 6,
        'armor_class': 16,
        'conditions': ['poisoned'],
        'death_saves_successes': 1,
        'death_saves_failures': 2,
        'concentrating_on': 'Bless',
        'dexterity': 14,
    }, {'id': 'member-1'})

    assert row['hp'] == 17
    assert row['max_hp'] == 40
    assert row['temporary_hit_points'] == 6
    assert row['temp_hp'] == 6
    assert row['conditions'] == ['poisoned']
    assert row['death_saves_successes'] == 1
    assert row['death_saves_failures'] == 2
    assert row['concentrating_on'] == 'Bless'


def test_character_row_clamps_unsafe_death_save_and_temp_values():
    row = live_party_utils._character_row({
        'id': 'char-1',
        'max_hit_points': 10,
        'current_hit_points': 0,
        'temporary_hit_points': -4,
        'death_saves_successes': 9,
        'death_saves_failures': -2,
    }, {})

    assert row['temporary_hit_points'] == 0
    assert row['death_saves_successes'] == 3
    assert row['death_saves_failures'] == 0


class _Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, _limit):
        return list(self.rows)


class _Collection:
    def __init__(self, rows):
        self.rows = rows
        self.queries = []

    async def find_one(self, query, projection=None):
        return next((row for row in self.rows if all(row.get(k) == v for k, v in query.items())), None)

    @staticmethod
    def _matches(row, query):
        """Match every clause, with $in wherever it appears.

        The earlier version special-cased $in on `status` and `id` and did
        plain equality for anything else, so a query combining campaign_id
        with $in on another field silently matched nothing. A real Mongo
        query would have returned the rows, which meant this fake could
        fail a correct change.
        """
        for field, expected in query.items():
            actual = row.get(field)
            if isinstance(expected, dict) and '$in' in expected:
                allowed = expected['$in']
                # None in the allowed list also matches a missing field,
                # as it does in Mongo.
                if actual not in allowed:
                    return False
            elif actual != expected:
                return False
        return True

    def find(self, query, projection=None):
        self.queries.append((query, projection))
        return _Cursor([row for row in self.rows if self._matches(row, query)])


def test_live_party_builder_uses_approved_linked_character_sheets_and_legacy_fallback(monkeypatch):
    members = _Collection([
        {'id': 'member-active', 'campaign_id': 'campaign-1', 'character_id': 'char-1', 'status': 'active'},
        {'id': 'member-pending', 'campaign_id': 'campaign-1', 'character_id': 'char-2', 'status': 'pending'},
    ])
    characters = _Collection([
        {
            'id': 'char-1', 'campaign_id': 'campaign-1', 'name': 'Ari',
            'current_hit_points': 7, 'max_hit_points': 20, 'armor_class': 16,
        },
        {
            'id': 'char-2', 'campaign_id': 'campaign-1', 'name': 'Pending Hero',
            'current_hit_points': 20, 'max_hit_points': 20, 'armor_class': 14,
        },
    ])
    legacy = _Collection([
        {'id': 'legacy-ari', 'campaign_id': 'campaign-1', 'name': 'Ari', 'hp': 99, 'max_hp': 99, 'ac': 99},
        {'id': 'legacy-bryn', 'campaign_id': 'campaign-1', 'name': 'Bryn', 'hp': 12, 'max_hp': 12, 'ac': 13},
    ])
    monkeypatch.setattr(live_party, 'db', SimpleNamespace(
        campaigns=_Collection([{'id': 'campaign-1', 'dm_user_id': 'gm'}]),
        campaign_members=members,
        player_characters=characters,
        players=legacy,
    ))

    rows = asyncio.run(live_party.build_live_party_rows('campaign-1'))

    assert [row['name'] for row in rows] == ['Ari', 'Bryn']
    ari = rows[0]
    assert ari['source'] == 'character'
    assert ari['hp'] == 7
    assert ari['ac'] == 16
    assert all(row['name'] != 'Pending Hero' for row in rows)


def test_live_bootstrap_uses_the_same_canonical_party_builder():
    source = (Path(__file__).resolve().parents[1] / 'routes' / 'dashboard_bootstrap.py').read_text()
    assert 'players_request = build_live_party_rows(campaign_id)' in source

def test_live_party_includes_only_this_campaigns_gm_sheets_once():
    class Database(SimpleNamespace):
        def __bool__(self):
            raise NotImplementedError("Mongo databases do not support truth testing")

    characters = [
        {'id': 'gm-sheet', 'name': 'GM Sheet', 'campaign_id': 'one', 'user_id': 'gm'},
        {'id': 'linked', 'name': 'Linked', 'campaign_id': 'one', 'user_id': 'gm'},
        {'id': 'other', 'name': 'Other campaign', 'campaign_id': 'two', 'user_id': 'gm'},
        {'id': 'unapproved', 'name': 'Unapproved', 'campaign_id': 'one', 'user_id': 'player'},
    ]
    database = Database(
        campaigns=_Collection([{'id': 'one', 'dm_user_id': 'gm'}]),
        campaign_members=_Collection([{'id': 'member', 'status': 'active', 'campaign_id': 'one', 'character_id': 'linked'}]),
        player_characters=_Collection(characters),
        players=_Collection([{'id': 'legacy', 'name': 'GM Sheet', 'campaign_id': 'one'}]),
    )
    rows = asyncio.run(live_party.build_live_party_rows('one', database))
    assert [row['character_id'] for row in rows] == ['linked', 'gm-sheet']
    assert rows[1]['member_id'] is None
    assert rows[1]['source'] == 'character'


def test_characters_linked_without_a_member_pointer_still_reach_the_party():
    """The reported bug: characters in the campaign, empty party.

    Three code paths attach a player to a campaign and only the join-code
    flow sets the member's character_id. A character linked by either of
    the others names the campaign on its own sheet and was invisible here,
    so a GM saw no party while the players saw themselves in the campaign.
    """
    class Database(SimpleNamespace):
        def __bool__(self):
            raise NotImplementedError("Mongo databases do not support truth testing")

    database = Database(
        campaigns=_Collection([{'id': 'spilsby', 'dm_user_id': 'gm'}]),
        campaign_members=_Collection([
            # Joined, approved, but no character_id was ever written.
            {'id': 'm-rowan', 'status': 'active', 'campaign_id': 'spilsby', 'user_id': 'rowan'},
            {'id': 'm-bryn', 'status': 'active', 'campaign_id': 'spilsby', 'user_id': 'bryn'},
        ]),
        player_characters=_Collection([
            {'id': 'c-rowan', 'name': 'Rowan', 'campaign_id': 'spilsby', 'user_id': 'rowan',
             'current_hit_points': 11, 'max_hit_points': 24, 'armor_class': 15},
            {'id': 'c-bryn', 'name': 'Bryn', 'campaign_id': 'spilsby', 'user_id': 'bryn'},
            {'id': 'c-elsewhere', 'name': 'Other Campaign', 'campaign_id': 'other', 'user_id': 'rowan'},
        ]),
        players=_Collection([]),
    )

    rows = asyncio.run(live_party.build_live_party_rows('spilsby', database))

    assert sorted(row['name'] for row in rows) == ['Bryn', 'Rowan']
    rowan = next(row for row in rows if row['name'] == 'Rowan')
    assert rowan['hp'] == 11
    assert rowan['ac'] == 15
    assert rowan['source'] == 'character'
    assert all(row['name'] != 'Other Campaign' for row in rows)


def test_repairing_the_link_does_not_bypass_approval():
    """A character whose owner is still pending stays out.

    This repairs a broken pointer; it does not widen who is allowed in.
    """
    class Database(SimpleNamespace):
        def __bool__(self):
            raise NotImplementedError("Mongo databases do not support truth testing")

    database = Database(
        campaigns=_Collection([{'id': 'spilsby', 'dm_user_id': 'gm'}]),
        campaign_members=_Collection([
            {'id': 'm-waiting', 'status': 'pending', 'campaign_id': 'spilsby', 'user_id': 'waiting'},
        ]),
        player_characters=_Collection([
            {'id': 'c-waiting', 'name': 'Not Approved Yet', 'campaign_id': 'spilsby', 'user_id': 'waiting'},
        ]),
        players=_Collection([]),
    )

    rows = asyncio.run(live_party.build_live_party_rows('spilsby', database))
    assert rows == []


def test_a_character_is_not_listed_twice_when_both_links_exist():
    """Once the member pointer is repaired, both sources see it."""
    class Database(SimpleNamespace):
        def __bool__(self):
            raise NotImplementedError("Mongo databases do not support truth testing")

    database = Database(
        campaigns=_Collection([{'id': 'spilsby', 'dm_user_id': 'gm'}]),
        campaign_members=_Collection([
            {'id': 'm1', 'status': 'active', 'campaign_id': 'spilsby', 'user_id': 'rowan', 'character_id': 'c-rowan'},
        ]),
        player_characters=_Collection([
            {'id': 'c-rowan', 'name': 'Rowan', 'campaign_id': 'spilsby', 'user_id': 'rowan'},
        ]),
        players=_Collection([]),
    )

    rows = asyncio.run(live_party.build_live_party_rows('spilsby', database))
    assert [row['character_id'] for row in rows] == ['c-rowan']


def test_a_stranger_with_a_matching_campaign_id_is_not_admitted():
    """campaign_id on a character is not by itself permission to appear."""
    class Database(SimpleNamespace):
        def __bool__(self):
            raise NotImplementedError("Mongo databases do not support truth testing")

    database = Database(
        campaigns=_Collection([{'id': 'spilsby', 'dm_user_id': 'gm'}]),
        campaign_members=_Collection([]),
        player_characters=_Collection([
            {'id': 'c-nobody', 'name': 'Uninvited', 'campaign_id': 'spilsby', 'user_id': 'nobody'},
        ]),
        players=_Collection([]),
    )

    rows = asyncio.run(live_party.build_live_party_rows('spilsby', database))
    assert rows == []
