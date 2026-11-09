"""Custom monster content must never be readable or writable across campaigns.

These tests use fictional records only. A guessed campaign ID must not allow
another logged-in account to view or mutate its GM's monster library.
"""
import asyncio
import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('custom_creature_routes_under_test', ROOT / 'routes' / 'admin.py')
admin = importlib.util.module_from_spec(spec)
spec.loader.exec_module(admin)

MONSTER = admin.CustomCreatureCreate(name='Gate Guardian', hp=25, ac=15)


class ForbiddenDb:
    """Never even attempt a database read/write after ownership denial."""
    def __getattr__(self, name):
        raise AssertionError(f'Unauthorized request touched database collection {name}')


def run_action(action, caller):
    campaign = 'camp-owner'
    if action == 'read':
        return asyncio.run(admin.get_custom_creatures(campaign, username=caller))
    if action == 'create':
        return asyncio.run(admin.create_custom_creature(campaign, MONSTER, username=caller))
    if action == 'update':
        return asyncio.run(admin.update_custom_creature(campaign, 'monster-1', MONSTER, username=caller))
    if action == 'delete':
        return asyncio.run(admin.delete_custom_creature(campaign, 'monster-1', username=caller))
    if action == 'import':
        return asyncio.run(admin.import_custom_creatures(campaign, [MONSTER], username=caller))
    raise AssertionError('Unknown test operation')


@pytest.mark.parametrize('operation', ['read', 'create', 'update', 'delete', 'import'])
def test_other_logged_in_account_cannot_view_or_change_gms_monsters(monkeypatch, operation):
    checked = []

    async def check(campaign_id, username):
        checked.append((campaign_id, username))
        if username != 'owner':
            raise HTTPException(status_code=404, detail='Campaign not found')

    monkeypatch.setattr(admin, 'verify_campaign_ownership', check)
    monkeypatch.setattr(admin, 'db', ForbiddenDb())

    with pytest.raises(HTTPException) as denied:
        run_action(operation, caller='outsider')
    assert denied.value.status_code == 404
    assert checked == [('camp-owner', 'outsider')]


def test_owner_can_still_read_their_custom_monster_records(monkeypatch):
    records = [{'id': 'monster-1', 'campaign_id': 'camp-owner', 'name': 'Gate Guardian'}]
    seen = []

    async def check(campaign_id, username):
        seen.append((campaign_id, username))
        if username != 'owner':
            raise HTTPException(status_code=404)

    class Collection:
        def find(self, query, projection):
            assert query == {'campaign_id': 'camp-owner'}
            assert projection == {'_id': 0}
            return self

        def sort(self, field, direction):
            assert field == 'name'
            return self

        async def to_list(self, size):
            assert size == 500
            return records

    monkeypatch.setattr(admin, 'verify_campaign_ownership', check)
    monkeypatch.setattr(admin, 'db', SimpleNamespace(custom_creatures=Collection()))
    result = run_action('read', caller='owner')
    assert result == records
    assert seen == [('camp-owner', 'owner')]
