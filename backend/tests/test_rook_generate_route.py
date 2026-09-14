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

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))


def load_module():
    path = BACKEND_ROOT / 'routes' / 'rook_generate.py'
    spec = importlib.util.spec_from_file_location('focused_rook_generate_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


rook_generate_module = load_module()
from models import UnseenServantRequest


def make_request(**overrides):
    data = {
        'prompt': 'Create something that fits the campaign.',
        'entity_type': 'npc',
        'campaign_id': 'campaign-1',
        'location_id': None,
    }
    data.update(overrides)
    return UnseenServantRequest(**data)


def test_extract_generated_json_accepts_fenced_object_and_rejects_non_object():
    parsed = rook_generate_module.extract_generated_json('```json\n{"name":"Mara"}\n```')
    assert parsed == {'name': 'Mara'}
    with pytest.raises(ValueError):
        rook_generate_module.extract_generated_json('no json here')


def test_generate_system_message_uses_shared_brain_context_and_edition(monkeypatch):
    monkeypatch.setattr(rook_generate_module, '_source_boundary_fragment', lambda: 'SOURCE BOUNDARY')
    message = rook_generate_module.build_generate_system_message(
        campaign_context='RECENT SESSION NOTES: saved GM event',
        edition_context='2024 EDITION RULES',
    )
    assert message.startswith('SOURCE BOUNDARY')
    assert 'You are ROOK' in message
    assert 'JSON OUTPUT RULES' in message
    assert 'Generate original campaign content' in message
    assert 'SAVED GM CAMPAIGN CONTEXT' in message
    assert '2024 EDITION RULES' in message
    assert 'Do not claim the entity is saved' in message


def test_remove_legacy_generate_keeps_backwards_alias():
    class FakeRoute:
        def __init__(self, path, methods):
            self.path = path
            self.methods = set(methods)

    router = SimpleNamespace(routes=[
        FakeRoute('/rook/generate', {'POST'}),
        FakeRoute('/unseen-servant/generate', {'POST'}),
        FakeRoute('/rook/chat', {'POST'}),
    ])
    removed = rook_generate_module.remove_legacy_rook_generate_route(router)
    assert removed == 1
    assert [(item.path, item.methods) for item in router.routes] == [
        ('/unseen-servant/generate', {'POST'}),
        ('/rook/chat', {'POST'}),
    ]


def test_focused_router_registers_rook_generate_once():
    matches = [
        route for route in rook_generate_module.router.routes
        if getattr(route, 'path', '') == '/rook/generate' and 'POST' in getattr(route, 'methods', set())
    ]
    assert len(matches) == 1
    assert matches[0].endpoint.__name__ == 'rook_generate'


def test_place_target_is_validated_before_generation_and_is_campaign_scoped(monkeypatch):
    class Campaigns:
        async def find_one(self, query, projection=None):
            assert query == {'id': 'campaign-1', 'dm_user_id': 'gm-user'}
            return {'id': 'campaign-1', 'dm_user_id': 'gm-user', 'rules_edition': '2024'}

    class Locations:
        async def find_one(self, query, projection=None):
            assert query == {'id': 'loc-1', 'campaign_id': 'campaign-1'}
            return {'id': 'loc-1', 'campaign_id': 'campaign-1', 'places_of_interest': []}

    monkeypatch.setattr(
        rook_generate_module,
        'db',
        SimpleNamespace(campaigns=Campaigns(), locations=Locations()),
    )
    request = make_request(entity_type='place_of_interest', location_id='loc-1')
    campaign, location = asyncio.run(rook_generate_module.validate_generate_target(request, 'gm-user'))
    assert campaign['id'] == 'campaign-1'
    assert location['id'] == 'loc-1'


def test_place_without_location_id_fails_before_ai_work(monkeypatch):
    class Campaigns:
        async def find_one(self, query, projection=None):
            return {'id': 'campaign-1', 'dm_user_id': 'gm-user'}

    monkeypatch.setattr(
        rook_generate_module,
        'db',
        SimpleNamespace(campaigns=Campaigns(), locations=SimpleNamespace()),
    )
    request = make_request(entity_type='place_of_interest', location_id=None)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(rook_generate_module.validate_generate_target(request, 'gm-user'))
    assert exc.value.status_code == 400
    assert 'location_id required' in exc.value.detail


def test_place_persistence_scopes_final_update_to_campaign(monkeypatch):
    class Locations:
        def __init__(self):
            self.updates = []

        async def update_one(self, query, update):
            self.updates.append((query, update))

    locations = Locations()
    monkeypatch.setattr(
        rook_generate_module,
        'db',
        SimpleNamespace(locations=locations),
    )
    request = make_request(entity_type='place_of_interest', location_id='loc-1')
    target = {
        'id': 'loc-1',
        'campaign_id': 'campaign-1',
        'places_of_interest': [{'id': 'old', 'name': 'Old Shop'}],
    }
    entity_id, entity_name = asyncio.run(
        rook_generate_module.persist_generated_entity(
            request,
            {'name': 'The Lantern & Lute', 'place_type': 'tavern'},
            username='gm-user',
            target_location=target,
        )
    )
    assert entity_id
    assert entity_name == 'The Lantern & Lute'
    query, update = locations.updates[0]
    assert query == {'id': 'loc-1', 'campaign_id': 'campaign-1'}
    assert update['$set']['places_of_interest'][0]['name'] == 'Old Shop'
    assert update['$set']['places_of_interest'][1]['name'] == 'The Lantern & Lute'


def test_generate_route_uses_edition_context_and_saves_after_valid_json(monkeypatch):
    captured = {}

    class FakeChat:
        def __init__(self, *, api_key, session_id, system_message):
            captured['system_message'] = system_message

        def with_model(self, provider, model):
            captured['model'] = (provider, model)
            return self

        async def send_message(self, message):
            captured['user_prompt'] = message.text
            return '{"name":"Mara Vell","race":"Human","class_name":"Commoner"}'

    async def allowed(*args, **kwargs):
        return True

    async def target(request, username):
        return ({'id': 'campaign-1', 'dm_user_id': 'gm-user'}, None)

    async def persist(request, entity_data, *, username, target_location=None):
        captured['persisted'] = (request.entity_type, entity_data, username)
        return ('entity-1', entity_data['name'])

    async def context(campaign_id):
        return 'SAVED CAMPAIGN FACTS'

    monkeypatch.setattr(rook_generate_module, 'check_ai_access', allowed)
    monkeypatch.setattr(rook_generate_module, 'record_ai_usage', allowed)
    monkeypatch.setattr(rook_generate_module, 'validate_generate_target', target)
    monkeypatch.setattr(rook_generate_module, 'persist_generated_entity', persist)
    monkeypatch.setattr(rook_generate_module, 'get_campaign_context', context)
    monkeypatch.setattr(rook_generate_module, 'get_llm_api_key', lambda provider: 'test-key')
    monkeypatch.setattr(rook_generate_module, '_source_boundary_fragment', lambda: 'SOURCE BOUNDARY')
    monkeypatch.setattr(rook_generate_module, '_edition_prompt_fragment', lambda campaign: '2024 EDITION RULES')
    monkeypatch.setattr(rook_generate_module, 'LlmChat', FakeChat)

    result = asyncio.run(rook_generate_module.rook_generate(make_request(), username='gm-user'))
    assert result.success is True
    assert result.entity_id == 'entity-1'
    assert result.entity_name == 'Mara Vell'
    assert captured['persisted'][1]['name'] == 'Mara Vell'
    assert '2024 EDITION RULES' in captured['system_message']
    assert 'SAVED CAMPAIGN FACTS' in captured['system_message']
    assert 'USER REQUEST' in captured['user_prompt']
