"""Moving a character to another campaign releases it from the old campaign.

The old campaign's roster kept pointing at the character, so the old GM still
saw it in their live party and could change its campaign status.
"""
import asyncio
import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

from unittest.mock import AsyncMock, patch  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from utils import live_party  # noqa: E402
from utils.character_campaign_link import (  # noqa: E402
    character_belongs_to_campaign,
    release_character_from_other_campaigns,
)


def _matches(doc, query):
    for key, cond in query.items():
        value = doc.get(key)
        if isinstance(cond, dict):
            if '$in' in cond and value not in cond['$in']:
                return False
            if '$ne' in cond and value == cond['$ne']:
                return False
        elif value != cond:
            return False
    return True


class _Result:
    def __init__(self, matched=0, modified=0):
        self.matched_count = matched
        self.modified_count = modified


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _limit=None):
        return [dict(d) for d in self.docs]


class _Collection:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    def find(self, query, _projection=None):
        return _Cursor([d for d in self.docs if _matches(d, query)])

    async def find_one(self, query, _projection=None):
        return next((dict(d) for d in self.docs if _matches(d, query)), None)

    async def update_one(self, query, update):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get('$set', {}))
                return _Result(1, 1)
        return _Result(0, 0)

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return _Result(1, 1)

    async def update_many(self, query, update):
        count = 0
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get('$set', {}))
                count += 1
        return _Result(count, count)


class _Db:
    def __init__(self, **collections):
        for name, docs in collections.items():
            setattr(self, name, _Collection(docs))

    def __getattr__(self, name):
        if name.startswith('_'):
            raise AttributeError(name)
        collection = _Collection()
        setattr(self, name, collection)
        return collection


def _moved_world():
    return _Db(
        campaign_members=[
            {'id': 'm-old', 'campaign_id': 'old', 'user_id': 'pat', 'character_id': 'hero', 'status': 'active'},
            {'id': 'm-new', 'campaign_id': 'new', 'user_id': 'pat', 'character_id': 'hero', 'status': 'active'},
        ],
        player_characters=[{'id': 'hero', 'user_id': 'pat', 'name': 'Hero', 'campaign_id': 'new'}],
    )


def test_joining_a_new_campaign_releases_the_old_roster_link():
    db = _moved_world()
    asyncio.run(release_character_from_other_campaigns(db, 'hero', 'new'))
    members = {m['id']: m for m in db.campaign_members.docs}
    assert members['m-old']['character_id'] is None
    assert members['m-new']['character_id'] == 'hero'


def test_a_moved_character_is_not_in_the_old_campaigns_live_party():
    db = _moved_world()  # even with a stale link left in place
    rows = asyncio.run(live_party.build_live_party_rows('old', database=db))
    assert [row.get('name') for row in rows if row.get('name') == 'Hero'] == []
    assert [row.get('name') for row in asyncio.run(live_party.build_live_party_rows('new', database=db))].count('Hero') == 1


def test_older_characters_with_no_campaign_id_still_show_on_their_roster():
    assert character_belongs_to_campaign({'id': 'x'}, 'old') is True
    assert character_belongs_to_campaign({'id': 'x', 'campaign_id': 'new'}, 'old') is False


def test_the_old_gm_cannot_change_a_moved_characters_status():
    from routes import campaign_invites
    db = _moved_world()
    with patch.object(campaign_invites, 'db', db), \
         patch.object(campaign_invites, 'verify_campaign_ownership', AsyncMock()), \
         patch.object(campaign_invites, 'end_live_sessions', AsyncMock()):
        asyncio.run(campaign_invites.update_campaign_member_status('old', 'm-old', {'status': 'dead'}, username='old-gm'))
    assert db.player_characters.docs[0].get('campaign_join_status') is None


def _rejoin_world():
    return _Db(
        campaign_invites=[{'code': 'ABC123', 'campaign_id': 'old'}],
        campaigns=[{'id': 'old', 'dm_user_id': 'old-gm', 'name': 'Old', 'join_mode': 'gm_approval'}],
        campaign_members=[{'id': 'm-old', 'campaign_id': 'old', 'user_id': 'pat', 'character_id': 'hero', 'status': 'active'}],
        player_characters=[
            {'id': 'hero', 'user_id': 'pat', 'name': 'Hero', 'campaign_id': 'new'},
            {'id': 'villain', 'user_id': 'pat', 'name': 'Villain'},
        ],
    )


def _join(db, character_id):
    from routes import campaign_invites
    with patch.object(campaign_invites, 'db', db):
        return asyncio.run(campaign_invites.join_campaign_by_code({'join_code': 'ABC123', 'character_id': character_id}, username='pat'))


def test_a_replacement_after_a_release_needs_gm_approval_again():
    db = _rejoin_world()
    asyncio.run(release_character_from_other_campaigns(db, 'hero', 'new'))  # Hero moved to another campaign
    result = _join(db, 'villain')
    assert result['status'] == 'pending'
    member = db.campaign_members.docs[0]
    assert member['character_id'] == 'villain' and member['status'] == 'pending'


def test_the_released_character_coming_back_keeps_its_approval():
    db = _rejoin_world()
    asyncio.run(release_character_from_other_campaigns(db, 'hero', 'new'))
    assert _join(db, 'hero')['status'] == 'active'
