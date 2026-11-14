"""Review moderation must not depend on whether feedback is positive.

Only in-memory mocks; no production data is read or modified.
"""
import asyncio
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
for key, value in {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'rqk_fair_review_tests',
    'JWT_SECRET_KEY': 'test-only-review-secret',
    'APP_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
}.items():
    os.environ.setdefault(key, value)

spec = importlib.util.spec_from_file_location('rqk_fair_review_tests', ROOT / 'routes' / 'admin.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fake_db(review=None):
    return SimpleNamespace(
        site_settings=SimpleNamespace(find_one=AsyncMock(return_value=None)),
        reviews=SimpleNamespace(
            find_one=AsyncMock(return_value=review),
            insert_one=AsyncMock(),
            update_one=AsyncMock(),
        ),
    )


@pytest.mark.parametrize('rating', [1, 2, 3, 4, 5])
def test_new_reviews_of_every_rating_await_admin_review(monkeypatch, rating):
    db = fake_db()
    monkeypatch.setattr(module, 'db', db)

    result = asyncio.run(module.create_review(
        module.ReviewCreate(rating=rating, comment='Helpful feedback from an actual user'),
        username='tester',
    ))

    stored = db.reviews.insert_one.await_args.args[0]
    assert stored['rating'] == rating
    assert stored['username'] == 'tester'
    assert stored['is_approved'] is False
    assert stored['is_featured'] is False
    assert result['is_featured'] is False
    assert 'moderation' in result['message'].lower()


@pytest.mark.parametrize('rating', [1, 3, 5])
def test_edits_of_any_rating_return_to_moderation(monkeypatch, rating):
    db = fake_db(review={'id': 'r1', 'username': 'tester', 'rating': 5, 'is_approved': True, 'is_featured': True})
    monkeypatch.setattr(module, 'db', db)

    result = asyncio.run(module.update_review(
        module.ReviewCreate(rating=rating, comment='Updated honest review'),
        username='tester',
    ))

    query, update = db.reviews.update_one.await_args.args
    assert query == {'username': 'tester'}
    assert update['$set']['rating'] == rating
    assert update['$set']['is_approved'] is False
    assert update['$set']['is_featured'] is False
    assert result['is_featured'] is False


@pytest.mark.parametrize('rating', [1, 5])
def test_admin_can_approve_either_positive_or_critical_review(monkeypatch, rating):
    db = fake_db(review={'id': 'r1', 'rating': rating, 'is_approved': False, 'is_featured': False})
    monkeypatch.setattr(module, 'db', db)
    monkeypatch.setattr(module, 'verify_admin', AsyncMock())

    result = asyncio.run(module.toggle_review_approval(review_id='r1', username='site-admin'))
    query, update = db.reviews.update_one.await_args.args
    assert query == {'id': 'r1'}
    assert update['$set']['is_approved'] is True
    assert update['$set']['is_featured'] is True
    assert result['is_approved'] is True
