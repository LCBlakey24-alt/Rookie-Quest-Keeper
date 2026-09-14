import asyncio
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))


def load_module():
    path = BACKEND_ROOT / 'routes' / 'rook_form_fill.py'
    spec = importlib.util.spec_from_file_location('focused_rook_form_fill_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


rook_form_fill_module = load_module()
from models import RookFormField, RookFormFillRequest


def make_request(**overrides):
    data = {
        'section': 'NPC basics',
        'prompt': 'Draft a memorable innkeeper.',
        'fields': [
            RookFormField(name='name', label='Name'),
            RookFormField(name='role', label='Role', choices=['Innkeeper', 'Guard']),
        ],
        'current_values': {},
        'campaign_id': '',
    }
    data.update(overrides)
    return RookFormFillRequest(**data)


def test_extract_json_object_accepts_plain_and_fenced_json():
    assert rook_form_fill_module.extract_json_object('{"suggestions":{"name":"Mara"}}')['suggestions']['name'] == 'Mara'
    fenced = '```json\n{"summary":"Draft","suggestions":{"name":"Mara"}}\n```'
    assert rook_form_fill_module.extract_json_object(fenced)['summary'] == 'Draft'


def test_sanitizer_rejects_unknown_fields_and_invalid_choices():
    request = make_request()
    result = rook_form_fill_module.sanitize_form_fill_suggestions(request, {
        'name': 'Mara Vell',
        'role': 'Archmage',
        'secret_admin_field': 'Nope',
    })
    assert result == {'name': 'Mara Vell'}


def test_sanitizer_maps_equivalent_string_choices_back_to_declared_type():
    request = RookFormFillRequest(
        section='Numbers',
        prompt='Pick a tier',
        fields=[RookFormField(name='tier', choices=[1, 2, 3])],
    )
    result = rook_form_fill_module.sanitize_form_fill_suggestions(request, {'tier': '2'})
    assert result == {'tier': 2}


def test_player_facing_form_fill_brain_contains_spoiler_safety(monkeypatch):
    monkeypatch.setattr(rook_form_fill_module, '_source_boundary_fragment', lambda: 'SOURCE BOUNDARY')
    message = rook_form_fill_module.build_form_fill_system_message(
        field_names=['name'],
        campaign_context='{"name":"Public Campaign"}',
        edition_context='2024 RULES',
        player_facing=True,
    )
    assert 'PLAYER-FACING SAFETY' in message
    assert 'JSON OUTPUT RULES' in message
    assert 'PUBLIC PLAYER CAMPAIGN CONTEXT' in message
    assert 'SAVED GM CAMPAIGN CONTEXT' not in message
    assert 'Never claim anything was saved' in message


def test_remove_legacy_form_fill_only_removes_target_route():
    class FakeRoute:
        def __init__(self, path, methods):
            self.path = path
            self.methods = set(methods)

    router = SimpleNamespace(routes=[
        FakeRoute('/rook/form-fill', {'POST'}),
        FakeRoute('/rook/chat', {'POST'}),
        FakeRoute('/rook/form-fill', {'GET'}),
    ])
    removed = rook_form_fill_module.remove_legacy_rook_form_fill_route(router)
    assert removed == 1
    assert [(item.path, item.methods) for item in router.routes] == [
        ('/rook/chat', {'POST'}),
        ('/rook/form-fill', {'GET'}),
    ]


def test_focused_router_registers_form_fill_once():
    matches = [
        route for route in rook_form_fill_module.router.routes
        if getattr(route, 'path', '') == '/rook/form-fill' and 'POST' in getattr(route, 'methods', set())
    ]
    assert len(matches) == 1
    assert matches[0].endpoint.__name__ == 'rook_form_fill'


def test_linked_player_form_fill_never_receives_private_gm_context(monkeypatch):
    captured = {}
    campaign = {
        'id': 'campaign-1',
        'name': 'Public Campaign',
        'description': 'Known premise',
        'system': '5e 2024 Compatible',
        'rules_edition': '2024',
        'dm_user_id': 'actual-gm',
        'secret_plan': 'THE INNKEEPER IS THE VILLAIN',
    }

    class FakeChat:
        def __init__(self, *, api_key, session_id, system_message):
            captured['system_message'] = system_message

        def with_model(self, provider, model):
            captured['model'] = (provider, model)
            return self

        async def send_message(self, message):
            return '{"summary":"Draft","suggestions":{"name":"Mara Vell","role":"Innkeeper"}}'

    async def allowed(*args, **kwargs):
        return True

    async def membership(*args, **kwargs):
        return campaign

    async def no_private_context(*args, **kwargs):
        raise AssertionError('linked player form-fill must not call get_campaign_context')

    monkeypatch.setattr(rook_form_fill_module, 'check_ai_access', allowed)
    monkeypatch.setattr(rook_form_fill_module, 'verify_campaign_membership', membership)
    monkeypatch.setattr(rook_form_fill_module, 'record_ai_usage', allowed)
    monkeypatch.setattr(rook_form_fill_module, 'get_campaign_context', no_private_context)
    monkeypatch.setattr(rook_form_fill_module, 'get_llm_api_key', lambda provider: 'test-key')
    monkeypatch.setattr(rook_form_fill_module, '_source_boundary_fragment', lambda: 'SOURCE BOUNDARY')
    monkeypatch.setattr(rook_form_fill_module, '_edition_prompt_fragment', lambda value: '2024 RULES')
    monkeypatch.setattr(rook_form_fill_module, 'LlmChat', FakeChat)

    request = make_request(campaign_id='campaign-1')
    result = asyncio.run(rook_form_fill_module.rook_form_fill(request, username='player-user'))

    message = captured['system_message']
    assert result.suggestions == {'name': 'Mara Vell', 'role': 'Innkeeper'}
    assert 'PLAYER-FACING SAFETY' in message
    assert 'PUBLIC PLAYER CAMPAIGN CONTEXT' in message
    assert 'Public Campaign' in message
    assert 'Known premise' in message
    assert 'secret_plan' not in message
    assert 'THE INNKEEPER IS THE VILLAIN' not in message


def test_gm_form_fill_keeps_rich_context_and_edition_guidance(monkeypatch):
    captured = {}
    campaign = {
        'id': 'campaign-1',
        'name': 'GM Campaign',
        'rules_edition': '2014',
        'dm_user_id': 'gm-user',
    }

    class FakeChat:
        def __init__(self, *, api_key, session_id, system_message):
            captured['system_message'] = system_message

        def with_model(self, provider, model):
            return self

        async def send_message(self, message):
            return 'not-json-at-all'

    async def allowed(*args, **kwargs):
        return True

    async def membership(*args, **kwargs):
        return campaign

    async def private_context(campaign_id):
        return 'RECENT SESSION NOTES: private GM hook'

    monkeypatch.setattr(rook_form_fill_module, 'check_ai_access', allowed)
    monkeypatch.setattr(rook_form_fill_module, 'verify_campaign_membership', membership)
    monkeypatch.setattr(rook_form_fill_module, 'record_ai_usage', allowed)
    monkeypatch.setattr(rook_form_fill_module, 'get_campaign_context', private_context)
    monkeypatch.setattr(rook_form_fill_module, 'get_llm_api_key', lambda provider: 'test-key')
    monkeypatch.setattr(rook_form_fill_module, '_source_boundary_fragment', lambda: 'SOURCE BOUNDARY')
    monkeypatch.setattr(rook_form_fill_module, '_edition_prompt_fragment', lambda value: '2014 RULES')
    monkeypatch.setattr(rook_form_fill_module, 'LlmChat', FakeChat)

    request = make_request(campaign_id='campaign-1')
    result = asyncio.run(rook_form_fill_module.rook_form_fill(request, username='gm-user'))

    message = captured['system_message']
    assert result.suggestions == {}
    assert result.summary == 'Rook drafted importable field suggestions.'
    assert 'SAVED GM CAMPAIGN CONTEXT' in message
    assert 'private GM hook' in message
    assert '2014 RULES' in message
