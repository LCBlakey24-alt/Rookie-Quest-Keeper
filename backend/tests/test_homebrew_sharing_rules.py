"""Homebrew from a published book stays with its owner and their own campaigns."""
import asyncio
import copy
import importlib.util
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
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

_path = Path(__file__).resolve().parents[1] / 'routes' / 'homebrew.py'
_spec = importlib.util.spec_from_file_location('focused_homebrew_sharing_test_module', _path)
homebrew = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(homebrew)


class Collection:
    def __init__(self):
        self.docs = []

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return copy.deepcopy(doc)
        return None

    async def insert_one(self, doc):
        self.docs.append(copy.deepcopy(doc))

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(update.get('$set', {}))


class Db(dict):
    def __getattr__(self, name):
        return self.setdefault(name, Collection())

    def __getitem__(self, name):
        return self.setdefault(name, Collection())


@pytest.fixture
def db(monkeypatch):
    fake = Db()
    async def owner(campaign_id, username):
        if (campaign_id, username) != ('camp', 'gm'):
            raise HTTPException(status_code=403, detail='Not your campaign')
    monkeypatch.setattr(homebrew, 'db', fake)
    monkeypatch.setattr(homebrew, 'verify_campaign_ownership', owner)
    return fake


def save(username='gm', **fields):
    request = homebrew.HomebrewSaveRequest(content_type='race', data={'name': 'Owlfolk'}, **fields)
    return asyncio.run(homebrew.save_homebrew(request, username=username))


@pytest.mark.parametrize('visibility', ['public', 'shared_copy'])
def test_published_book_content_can_never_be_shared_publicly(db, visibility):
    with pytest.raises(HTTPException) as refused:
        save(visibility=visibility, content_source='published_book')
    assert refused.value.status_code == 400
    assert db['user_races'].docs == []


def test_published_book_content_can_be_private_or_for_your_own_campaign(db):
    private = save(visibility='private', content_source='published_book')['homebrew']
    assert private['content_source'] == 'published_book'
    assert private['share_policy'] == {'allowPrivateShare': False, 'allowCampaignUse': True, 'allowPublicListing': False}
    table = save(visibility='campaign', campaign_id='camp', content_source='published_book')['homebrew']
    assert (table['visibility'], table['campaign_id']) == ('campaign', 'camp')


def test_only_the_campaigns_gm_can_share_homebrew_with_it(db):
    with pytest.raises(HTTPException) as other_gm:
        save(username='someone-else', visibility='campaign', campaign_id='camp')
    assert other_gm.value.status_code == 403


def test_editing_keeps_the_published_book_flag(db):
    item = save(visibility='private', content_source='published_book')['homebrew']
    with pytest.raises(HTTPException):
        save(visibility='public', homebrew_id=item['id'])


def test_share_policy_from_the_client_is_ignored(db):
    request = homebrew.HomebrewSaveRequest(
        content_type='race', visibility='private', content_source='published_book',
        data={'name': 'Owlfolk', 'share_policy': {'allowPublicListing': True}},
    )
    saved = asyncio.run(homebrew.save_homebrew(request, username='gm'))['homebrew']
    assert saved['share_policy']['allowPublicListing'] is False


def test_original_content_may_still_be_public(db):
    saved = save(visibility='public', content_source='original')['homebrew']
    assert saved['visibility'] == 'public' and saved['share_policy']['allowPublicListing'] is True
