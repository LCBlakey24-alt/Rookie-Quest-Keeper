"""Privacy contract: user-created campaigns never become another user's defaults.

Synthetic records only. No production accounts or campaign material are read
or created by this test.
"""
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from routes import campaigns as campaigns_api


class Cursor:
    def __init__(self, records):
        self.records = records

    async def to_list(self, _limit):
        return list(self.records)


class CampaignCollection:
    def __init__(self):
        self.records = [
            {'id': 'private-1', 'dm_user_id': 'owner-a', 'name': 'Private world A'},
            {'id': 'private-2', 'dm_user_id': 'owner-a', 'name': 'Private adventure A'},
            {'id': 'new-1', 'dm_user_id': 'owner-b', 'name': 'New user's world'},
        ]
        self.queries = []

    def find(self, query, _projection):
        self.queries.append(('list', query))
        return Cursor([dict(item) for item in self.records if all(item.get(k) == v for k, v in query.items())])

    async def find_one(self, query, _projection):
        self.queries.append(('detail', query))
        return next((dict(item) for item in self.records
            if all(item.get(k) == v for k, v in query.items())), None)


def test_campaign_list_contains_only_owned_records_and_new_accounts_start_empty(monkeypatch):
    campaigns = CampaignCollection()
    monkeypatch.setattr(campaigns_api, 'db', SimpleNamespace(campaigns=campaigns))
    own = asyncio.run(campaigns_api.get_campaigns(username='owner-a'))
    other = asyncio.run(campaigns_api.get_campaigns(username='owner-b'))
    newcomer = asyncio.run(campaigns_api.get_campaigns(username='fresh-new-user'))

    assert {c['name'] for c in own} == {'Private world A', 'Private adventure A'}
    assert {c['name'] for c in other} == {"New user's world"}
    assert newcomer == []
    assert campaigns.queries == [
        ('list', {'dm_user_id': 'owner-a'}),
        ('list', {'dm_user_id': 'owner-b'}),
        ('list', {'dm_user_id': 'fresh-new-user'}),
    ]


def test_guessing_another_campaign_id_does_not_expose_private_world(monkeypatch):
    campaigns = CampaignCollection()
    monkeypatch.setattr(campaigns_api, 'db', SimpleNamespace(campaigns=campaigns))
    with pytest.raises(HTTPException) as denied:
        asyncio.run(campaigns_api.get_campaign('private-1', username='owner-b'))
    assert denied.value.status_code == 404
    assert campaigns.queries[-1] == ('detail', {'id': 'private-1', 'dm_user_id': 'owner-b'})
    own = asyncio.run(campaigns_api.get_campaign('private-1', username='owner-a'))
    assert own['name'] == 'Private world A'
