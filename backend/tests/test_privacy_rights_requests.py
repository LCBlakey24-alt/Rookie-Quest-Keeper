"""Privacy requests: owner isolation, staff-only review and safe response fields.

This test never contacts the production database.
"""
import asyncio
import json
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for k, v in {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'rqk_privacy_rights_unit_tests',
    'JWT_SECRET_KEY': 'unit-test-secret-only',
    'APP_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
}.items():
    os.environ.setdefault(k, v)

spec = importlib.util.spec_from_file_location(
    'rqk_privacy_rights_unit_tests', ROOT / 'routes' / 'privacy_rights.py',
)
routes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(routes)

class Cursor:
    def __init__(self, docs):
        self.docs = docs
    def sort(self, *_args):
        return self
    async def to_list(self, limit):
        return self.docs[:limit]

class PrivacyCollection:
    def __init__(self):
        self.docs = []
        self.read_queries = []
    async def insert_one(self, doc):
        self.docs.append(dict(doc))
    async def count_documents(self, query):
        permitted = set(query.get('status', {}).get('$in', []))
        return sum(1 for doc in self.docs if doc.get('status') in permitted)
    def find(self, query, projection=None):
        self.read_queries.append(query)
        docs = [dict(d) for d in self.docs if all(d.get(k) == v for k, v in query.items())]
        return Cursor(docs)
    async def update_one(self, query, update):
        found = next((d for d in self.docs if d.get('id') == query.get('id')), None)
        if not found:
            return SimpleNamespace(matched_count=0)
        found.update(update['$set'])
        return SimpleNamespace(matched_count=1)
    async def find_one(self, query, projection=None):
        return next((dict(d) for d in self.docs if d.get('id') == query.get('id')), None)

def setup(monkeypatch, *, is_admin=False):
    collection = PrivacyCollection()
    monkeypatch.setattr(routes, 'db', SimpleNamespace(privacy_rights_requests=collection))
    if is_admin:
        monkeypatch.setattr(routes, 'require_admin', AsyncMock())
    else:
        async def forbidden(_username):
            raise HTTPException(status_code=403, detail='Admin access required')
        monkeypatch.setattr(routes, 'require_admin', forbidden)
    return collection

def run(coro):
    result = asyncio.run(coro)
    if hasattr(result, 'body'):
        assert result.headers.get('cache-control') == 'private, no-store'
        return json.loads(result.body)
    return result

def request(**kwargs):
    return routes.PrivacyRightsRequestCreate(
        request_type=kwargs.get('request_type', 'access'), details=kwargs.get('details', '')
    )

def test_member_can_open_request_and_only_view_their_own_records(monkeypatch):
    collection = setup(monkeypatch)
    response = run(routes.create_privacy_request(request(details='Please provide a copy.'), username='owner'))
    assert response['request']['status'] == 'received'
    assert response['request']['request_type'] == 'access'
    assert 'completed' not in response['message']
    assert collection.docs[0]['username'] == 'owner'
    run(routes.create_privacy_request(request(request_type='deletion'), username='another'))

    owner_items = run(routes.list_my_privacy_requests(username='owner'))
    other_items = run(routes.list_my_privacy_requests(username='another'))
    assert len(owner_items) == len(other_items) == 1
    assert owner_items[0]['request_type'] == 'access'
    assert other_items[0]['request_type'] == 'deletion'
    assert 'username' not in str(owner_items)
    assert 'admin_notes' not in str(owner_items)
    assert collection.read_queries == [{'username': 'owner'}, {'username': 'another'}]

def test_non_admin_cannot_list_or_update_privacy_requests(monkeypatch):
    collection = setup(monkeypatch)
    run(routes.create_privacy_request(request(), username='owner'))
    with pytest.raises(HTTPException) as denied:
        run(routes.list_admin_privacy_requests(username='someone'))
    assert denied.value.status_code == 403
    with pytest.raises(HTTPException) as denied:
        run(routes.update_admin_privacy_request(
            'any-id', routes.PrivacyRightsRequestUpdate(status='responded'), username='someone',
        ))
    assert denied.value.status_code == 403
    assert collection.read_queries == []
    assert collection.docs[0]['status'] == 'received'

def test_admin_can_review_but_internal_notes_never_reach_requester(monkeypatch):
    collection = setup(monkeypatch, is_admin=True)
    posted = run(routes.create_privacy_request(request(request_type='correction'), username='owner'))
    request_id = posted['request']['id']

    result = run(routes.update_admin_privacy_request(
        request_id,
        routes.PrivacyRightsRequestUpdate(
            status='needs_information',
            admin_notes='Internal review notes only',
            public_note='Please check your recovery email for a separate reply.',
        ),
        username='administrator',
    ))
    assert result['admin_notes'] == 'Internal review notes only'
    assert result['updated_by'] == 'administrator'
    owner = run(routes.list_my_privacy_requests(username='owner'))[0]
    assert owner['status'] == 'needs_information'
    assert owner['public_note'].startswith('Please check')
    assert 'Internal review' not in str(owner)
    assert 'administrator' not in str(owner)
    assert owner['responded_at'] is None

    run(routes.update_admin_privacy_request(
        request_id, routes.PrivacyRightsRequestUpdate(status='responded'), username='administrator',
    ))
    assert run(routes.list_my_privacy_requests(username='owner'))[0]['responded_at']
    admin = run(routes.list_admin_privacy_requests(username='administrator'))
    assert admin[0]['username'] == 'owner'

def test_request_is_not_completed_just_by_submitting_it(monkeypatch):
    setup(monkeypatch)
    result = run(routes.create_privacy_request(request(request_type='deletion'), username='owner'))
    assert result['request']['status'] == 'received'
    assert 'erased' not in str(result).lower()

def test_invalid_types_notes_and_client_attempts_to_set_owner_are_rejected():
    for kwargs in [
        {'request_type': 'unknown'},
        {'request_type': 'access', 'username': 'another'},
        {'request_type': 'access', 'details': 'a' * 1001},
    ]:
        with pytest.raises(ValidationError):
            routes.PrivacyRightsRequestCreate(**kwargs)
    with pytest.raises(ValidationError):
        routes.PrivacyRightsRequestUpdate(status='all_done')
    with pytest.raises(ValidationError):
        routes.PrivacyRightsRequestUpdate(status='responded', admin_notes='x' * 1201)

def test_admin_update_nonexistent_request_returns_404(monkeypatch):
    setup(monkeypatch, is_admin=True)
    with pytest.raises(HTTPException) as missing:
        run(routes.update_admin_privacy_request(
            'does-not-exist', routes.PrivacyRightsRequestUpdate(status='in_review'),
            username='administrator',
        ))
    assert missing.value.status_code == 404


def test_admin_workload_summary_is_protected_and_counts_only_unresolved(monkeypatch):
    collection = setup(monkeypatch, is_admin=True)
    run(routes.create_privacy_request(request(), username='one'))
    posted = run(routes.create_privacy_request(request(request_type='correction'), username='two'))
    run(routes.update_admin_privacy_request(
        posted['request']['id'],
        routes.PrivacyRightsRequestUpdate(status='responded'),
        username='administrator',
    ))
    assert run(routes.admin_privacy_request_summary(username='administrator')) == {'pending_count': 1}

    async def reject(_username):
        raise HTTPException(status_code=403, detail='Admin access required')
    monkeypatch.setattr(routes, 'require_admin', reject)
    with pytest.raises(HTTPException) as exc:
        run(routes.admin_privacy_request_summary(username='not-admin'))
    assert exc.value.status_code == 403
