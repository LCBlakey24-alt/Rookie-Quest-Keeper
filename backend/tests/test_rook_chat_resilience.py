import asyncio
import importlib.util
import os
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))


def load_rook_chat_module():
    path = BACKEND_ROOT / 'routes' / 'rook_chat.py'
    spec = importlib.util.spec_from_file_location('rook_chat_resilience_test_module', path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


rook_chat_module = load_rook_chat_module()


async def allowed(*args, **kwargs):
    return True


def patch_common(monkeypatch):
    monkeypatch.setattr(rook_chat_module, 'check_ai_access', allowed)
    monkeypatch.setattr(rook_chat_module, '_source_boundary_fragment', lambda: 'SOURCE BOUNDARY')


def test_missing_ai_key_returns_service_unavailable(monkeypatch):
    patch_common(monkeypatch)
    monkeypatch.setattr(rook_chat_module, 'get_llm_api_key', lambda provider: None)

    request = rook_chat_module.RookChatRequest(message='Hello Rook')
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(rook_chat_module.rook_chat(request, username='tester'))

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == 'Rook is temporarily unavailable. Please try again shortly.'


def test_provider_failure_returns_service_unavailable(monkeypatch):
    patch_common(monkeypatch)
    monkeypatch.setattr(rook_chat_module, 'get_llm_api_key', lambda provider: 'test-key')

    class FailingChat:
        def __init__(self, **kwargs):
            pass

        def with_model(self, provider, model):
            return self

        async def send_message(self, message):
            raise RuntimeError('provider unavailable')

    monkeypatch.setattr(rook_chat_module, 'LlmChat', FailingChat)

    request = rook_chat_module.RookChatRequest(message='Hello Rook')
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(rook_chat_module.rook_chat(request, username='tester'))

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == 'Rook is temporarily unavailable. Please try again shortly.'


def test_usage_accounting_failure_does_not_discard_answer(monkeypatch):
    patch_common(monkeypatch)
    monkeypatch.setattr(rook_chat_module, 'get_llm_api_key', lambda provider: 'test-key')

    class SuccessfulChat:
        def __init__(self, **kwargs):
            pass

        def with_model(self, provider, model):
            return self

        async def send_message(self, message):
            return 'Useful answer'

    async def failing_usage(*args, **kwargs):
        raise RuntimeError('usage database unavailable')

    monkeypatch.setattr(rook_chat_module, 'LlmChat', SuccessfulChat)
    monkeypatch.setattr(rook_chat_module, 'record_ai_usage', failing_usage)

    request = rook_chat_module.RookChatRequest(message='Hello Rook')
    result = asyncio.run(rook_chat_module.rook_chat(request, username='tester'))

    assert result == {'response': 'Useful answer'}
