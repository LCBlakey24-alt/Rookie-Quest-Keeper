"""Giving a player a ready-made character from the admin page.

For handing someone a sheet instead of asking them to build one: a new
player, a child account, or a character the GM imported from a PDF on the
player's behalf.
"""

import asyncio
import os
import sys
import types
import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "admin-assign-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

# CI installs only the core backend packages, and routes/auth.py imports the
# email client at module level, which routes/admin.py pulls in transitively.
# Give it a stand-in when it is not installed, matching what
# test_admin_identity.py and test_access_checks.py already do here.
try:
    import resend  # noqa: F401
except ImportError:
    sys.modules['resend'] = types.SimpleNamespace(
        api_key=None, Emails=types.SimpleNamespace(send=lambda params: None)
    )

from fastapi import HTTPException  # noqa: E402

import routes.admin as admin  # noqa: E402


class _Collection:
    def __init__(self, rows=None):
        self.rows = list(rows or [])
        self.inserted = []
        self.updates = []

    async def find_one(self, query, projection=None):
        for row in self.rows:
            if all(row.get(k) == v for k, v in query.items()):
                return dict(row)
        return None

    async def insert_one(self, doc):
        self.inserted.append(doc)
        self.rows.append(doc)
        return SimpleNamespace(inserted_id='x')

    async def update_one(self, query, update, upsert=False):
        self.updates.append({'query': query, 'update': update, 'upsert': upsert})
        return SimpleNamespace(matched_count=0, upserted_id='m1')


def _db(users=None, characters=None, campaigns=None):
    return SimpleNamespace(
        users=_Collection(users),
        player_characters=_Collection(characters),
        campaigns=_Collection(campaigns),
        campaign_members=_Collection(),
    )


@pytest.fixture(autouse=True)
def _admin_allowed(monkeypatch):
    async def allow(_username):
        return None
    monkeypatch.setattr(admin, 'verify_admin', allow)


def _run(db, target, body, caller='LCBlakey24'):
    monkey = db
    import routes.admin as module
    original = module.db
    module.db = monkey
    try:
        return asyncio.run(module.admin_assign_character_to_user(target, body, caller))
    finally:
        module.db = original


SOURCE = {'id': 'src-1', 'name': 'Rina Ironside', 'user_id': 'LCBlakey24',
          'character_class': 'Fighter', 'level': 5, 'armor_class': 19, 'max_hit_points': 54}


def test_the_player_gets_their_own_copy():
    db = _db(users=[{'username': 'kathryn'}], characters=[SOURCE])

    result = _run(db, 'kathryn', {'character_id': 'src-1'})

    copy = result['character']
    assert copy['user_id'] == 'kathryn'
    assert copy['name'] == 'Rina Ironside'
    assert copy['armor_class'] == 19
    assert copy['level'] == 5
    # A new sheet, not the same one moved.
    assert copy['id'] != 'src-1'
    assert copy['assigned_from_character_id'] == 'src-1'


def test_the_original_is_left_alone():
    """A copy, so the same premade can be given to several people."""
    db = _db(users=[{'username': 'kathryn'}], characters=[SOURCE])

    _run(db, 'kathryn', {'character_id': 'src-1'})

    assert SOURCE['user_id'] == 'LCBlakey24'
    assert db.player_characters.updates == []


def test_assigning_into_a_campaign_writes_both_links():
    """Writing only the character's campaign_id is what hid characters
    from Live Play. Both halves are written here."""
    db = _db(users=[{'username': 'kathryn'}], characters=[SOURCE],
             campaigns=[{'id': 'spilsby'}])

    result = _run(db, 'kathryn', {'character_id': 'src-1', 'campaign_id': 'spilsby'})

    assert result['character']['campaign_id'] == 'spilsby'
    member = db.campaign_members.updates[0]
    assert member['upsert'] is True
    assert member['query'] == {'campaign_id': 'spilsby', 'user_id': 'kathryn'}
    assert member['update']['$set']['character_id'] == result['character']['id']
    assert member['update']['$set']['status'] == 'active'


def test_assigning_without_a_campaign_touches_no_membership():
    db = _db(users=[{'username': 'kathryn'}], characters=[SOURCE])

    result = _run(db, 'kathryn', {'character_id': 'src-1'})

    assert result['campaign_id'] is None
    assert db.campaign_members.updates == []


def test_an_unknown_account_is_refused():
    db = _db(users=[], characters=[SOURCE])

    with pytest.raises(HTTPException) as caught:
        _run(db, 'nobody', {'character_id': 'src-1'})
    assert caught.value.status_code == 404


def test_an_unknown_character_is_refused():
    db = _db(users=[{'username': 'kathryn'}], characters=[])

    with pytest.raises(HTTPException) as caught:
        _run(db, 'kathryn', {'character_id': 'missing'})
    assert caught.value.status_code == 404


def test_an_unknown_campaign_is_refused():
    db = _db(users=[{'username': 'kathryn'}], characters=[SOURCE], campaigns=[])

    with pytest.raises(HTTPException) as caught:
        _run(db, 'kathryn', {'character_id': 'src-1', 'campaign_id': 'ghost'})
    assert caught.value.status_code == 404


def test_a_missing_character_id_is_refused():
    db = _db(users=[{'username': 'kathryn'}], characters=[SOURCE])

    with pytest.raises(HTTPException) as caught:
        _run(db, 'kathryn', {})
    assert caught.value.status_code == 400


def test_only_an_admin_may_assign(monkeypatch):
    """The gate is the first thing the handler does."""
    async def deny(_username):
        raise HTTPException(status_code=403, detail='Admin only')
    monkeypatch.setattr(admin, 'verify_admin', deny)

    db = _db(users=[{'username': 'kathryn'}], characters=[SOURCE])
    with pytest.raises(HTTPException) as caught:
        _run(db, 'kathryn', {'character_id': 'src-1'}, caller='someone-else')
    assert caught.value.status_code == 403
    # Nothing was written before the refusal.
    assert db.player_characters.inserted == []
