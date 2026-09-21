import asyncio
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from utils import auth


class Collection:
    def __init__(self, value):
        self.value = value
        self.queries = []

    async def find_one(self, query, projection=None):
        self.queries.append((query, projection))
        return self.value


def db_for(*, campaign=None, membership=None, character=None):
    return SimpleNamespace(
        campaigns=Collection(campaign),
        campaign_members=Collection(membership),
        player_characters=Collection(character),
    )


def test_pending_membership_cannot_bypass_gm_approval_with_linked_character(monkeypatch):
    fake = db_for(
        campaign={'id': 'campaign-1', 'dm_user_id': 'gm'},
        membership={'status': 'pending', 'character_id': 'char-1'},
        character={'_id': 'char-1'},
    )
    monkeypatch.setattr(auth, 'db', fake)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(auth.verify_campaign_membership('campaign-1', 'player'))

    assert exc.value.status_code == 403
    assert 'waiting for GM approval' in exc.value.detail
    assert fake.player_characters.queries == []


def test_active_dead_and_retired_memberships_keep_player_access(monkeypatch):
    for status_name in ('active', 'dead', 'retired'):
        fake = db_for(
            campaign={'id': 'campaign-1', 'dm_user_id': 'gm'},
            membership={'status': status_name, 'character_id': 'char-1'},
            character=None,
        )
        monkeypatch.setattr(auth, 'db', fake)

        result = asyncio.run(auth.verify_campaign_membership('campaign-1', 'player'))
        assert result['id'] == 'campaign-1'


def test_removed_membership_is_denied_even_if_character_is_still_linked(monkeypatch):
    fake = db_for(
        campaign={'id': 'campaign-1', 'dm_user_id': 'gm'},
        membership={'status': 'removed', 'character_id': 'char-1'},
        character={'_id': 'char-1'},
    )
    monkeypatch.setattr(auth, 'db', fake)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(auth.verify_campaign_membership('campaign-1', 'player'))

    assert exc.value.status_code == 403
    assert 'no longer a member' in exc.value.detail
    assert fake.player_characters.queries == []


def test_legacy_character_link_still_works_when_no_membership_record_exists(monkeypatch):
    fake = db_for(
        campaign={'id': 'campaign-1', 'dm_user_id': 'gm'},
        membership=None,
        character={'_id': 'char-1'},
    )
    monkeypatch.setattr(auth, 'db', fake)

    result = asyncio.run(auth.verify_campaign_membership('campaign-1', 'player'))
    assert result['id'] == 'campaign-1'


def test_gm_access_does_not_require_player_membership(monkeypatch):
    fake = db_for(
        campaign={'id': 'campaign-1', 'dm_user_id': 'gm'},
        membership=None,
        character=None,
    )
    monkeypatch.setattr(auth, 'db', fake)

    result = asyncio.run(auth.verify_campaign_membership('campaign-1', 'gm'))
    assert result['dm_user_id'] == 'gm'
    assert fake.campaign_members.queries == []
