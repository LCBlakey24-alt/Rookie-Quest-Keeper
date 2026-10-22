import asyncio
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

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from utils.custom_calendar_rules import advance_calendar_date, check_calendar, validate_day


def calendar(day=25, month=1, year=592):
    return {
        'campaign_id': 'friday', 'calendar_type': 'custom',
        'days_per_week': 6,
        'custom_months': [
            {'name': f'Month {i + 1}', 'days': 30} for i in range(12)
        ],
        'current_day': day, 'current_month': month, 'current_year': year,
    }


def test_six_day_week_and_custom_month_boundaries():
    existing = calendar()
    assert advance_calendar_date(existing, 5) == {
        'current_day': 30, 'current_month': 1, 'current_year': 592,
    }
    assert advance_calendar_date(existing, 6) == {
        'current_day': 1, 'current_month': 2, 'current_year': 592,
    }
    assert advance_calendar_date(existing, 336) == {
        'current_day': 1, 'current_month': 1, 'current_year': 593,
    }


@pytest.mark.parametrize('days', [-1, 0, 10001, 1.5, '5'])
def test_invalid_advances_are_rejected(days):
    with pytest.raises(HTTPException) as exc:
        advance_calendar_date(calendar(), days)
    assert exc.value.status_code == 422


def test_calendar_structure_and_event_dates_are_validated():
    current = calendar()
    check_calendar(current)
    validate_day(current, 592, 12, 30)
    for proposed in [(592, 12, 31), (592, 13, 1), (592, 0, 1)]:
        with pytest.raises(HTTPException) as exc:
            validate_day(current, *proposed)
        assert exc.value.status_code == 422
    current['custom_months'][0]['days'] = 24
    with pytest.raises(HTTPException):
        check_calendar(current)


def load_world():
    spec = importlib.util.spec_from_file_location('calendar_world_test_module', ROOT / 'routes' / 'world.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CalendarCollection:
    def __init__(self, stored):
        self.stored = stored
        self.writes = []

    async def find_one(self, query, projection=None):
        return dict(self.stored) if self.stored and query.get('campaign_id') == self.stored['campaign_id'] else None

    async def update_one(self, query, update):
        self.writes.append((query, update))
        self.stored.update(update['$set'])
        return SimpleNamespace(matched_count=1)


class EventCollection:
    def __init__(self, events):
        self.events = events

    def find(self, query, projection=None):
        events = [event for event in self.events if event['campaign_id'] == query['campaign_id']]
        return SimpleNamespace(to_list=lambda limit: async_list(events))


async def async_list(values):
    return list(values)


def test_backend_rejects_calendar_structure_change_that_would_invalidate_events(monkeypatch):
    from models import CalendarUpdate
    world = load_world()

    async def allow(campaign_id, username):
        return None

    existing = calendar()
    event = {'campaign_id': 'friday', 'year': 592, 'month': 1, 'day': 30}
    collection = CalendarCollection(existing)
    monkeypatch.setattr(world, 'verify_campaign_ownership', allow)
    monkeypatch.setattr(world, 'db', SimpleNamespace(
        calendars=collection, calendar_events=EventCollection([event])
    ))
    proposed = [{**month} for month in existing['custom_months']]
    proposed[0]['days'] = 29
    with pytest.raises(HTTPException) as exc:
        asyncio.run(world.update_calendar(
            'friday', CalendarUpdate(custom_months=proposed), username='LCBlakey24'
        ))
    assert exc.value.status_code == 422
    assert not collection.writes


def test_backend_advances_only_target_campaign_calendar(monkeypatch):
    world = load_world()

    async def allow(campaign_id, username):
        return None

    collection = CalendarCollection(calendar())
    monkeypatch.setattr(world, 'verify_campaign_ownership', allow)
    monkeypatch.setattr(world, 'db', SimpleNamespace(calendars=collection))
    result = asyncio.run(world.advance_calendar('friday', 6, username='LCBlakey24'))
    assert result['current_month'] == 2
    assert result['current_day'] == 1
    assert collection.writes[0][0] == {'campaign_id': 'friday'}
