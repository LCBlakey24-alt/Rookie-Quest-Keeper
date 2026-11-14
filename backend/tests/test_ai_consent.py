"""Server-side, account-scoped Rook AI consent regressions."""

import os
import sys
import importlib.util
import unittest
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "ai-consent-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from fastapi import HTTPException  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from models import RookAiConsentUpdate, TemplateMatchRequest  # noqa: E402
from utils import auth as auth_utils  # noqa: E402

# CI installs the focused backend dependencies rather than every optional
# provider SDK. Load this route module directly, with a harmless email-client
# stand-in when Resend is absent, so the test cannot import the entire router
# package or contact an external service.
try:  # noqa: E402
    import resend  # noqa: F401
except ImportError:  # pragma: no cover - depends on local developer packages
    import types
    sys.modules['resend'] = types.SimpleNamespace(
        api_key=None,
        Emails=types.SimpleNamespace(send=lambda _params: None),
    )

_AUTH_SPEC = importlib.util.spec_from_file_location(
    'ai_consent_auth_routes',
    BACKEND_DIR / 'routes' / 'auth.py',
)
auth_routes = importlib.util.module_from_spec(_AUTH_SPEC)
_AUTH_SPEC.loader.exec_module(auth_routes)

_TEMPLATE_SPEC = importlib.util.spec_from_file_location(
    'ai_consent_character_templates',
    BACKEND_DIR / 'routes' / 'character_templates.py',
)
character_templates = importlib.util.module_from_spec(_TEMPLATE_SPEC)
_TEMPLATE_SPEC.loader.exec_module(character_templates)


class _Users:
    def __init__(self, documents):
        self.documents = {item['username']: deepcopy(item) for item in documents}
        self.find_calls = []
        self.update_calls = []

    async def find_one(self, query, projection=None):
        self.find_calls.append(deepcopy(query))
        document = self.documents.get(query.get('username'))
        return deepcopy(document) if document else None

    async def update_one(self, query, update):
        self.update_calls.append((deepcopy(query), deepcopy(update)))
        document = self.documents.get(query.get('username'))
        if document is None:
            return SimpleNamespace(matched_count=0)
        for key, value in update.get('$set', {}).items():
            document[key] = deepcopy(value)
        return SimpleNamespace(matched_count=1)


class _Usage:
    def __init__(self, count=0):
        self.count = count
        self.calls = []

    async def count_documents(self, query):
        self.calls.append(deepcopy(query))
        return self.count


class RookAiConsentTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.users = _Users([
            {'username': 'alice'},
            {'username': 'bob'},
            {'username': 'keeper-admin'},
        ])
        self.usage = _Usage()
        self.fake_db = SimpleNamespace(users=self.users, ai_usage=self.usage)

        self.originals = {
            'utils_db': auth_utils.db,
            'routes_db': auth_routes.db,
            'enforcement': auth_utils.AI_CONSENT_ENFORCEMENT,
            'utils_policy': auth_utils.AI_CONSENT_POLICY_VERSION,
            'routes_policy': auth_routes.AI_CONSENT_POLICY_VERSION,
            'limit': auth_utils.AI_MONTHLY_LIMIT,
            'is_admin': auth_utils.is_admin,
        }
        auth_utils.db = self.fake_db
        auth_routes.db = self.fake_db
        auth_utils.AI_CONSENT_POLICY_VERSION = 'rook-ai-test-v1'
        auth_routes.AI_CONSENT_POLICY_VERSION = 'rook-ai-test-v1'
        auth_utils.AI_CONSENT_ENFORCEMENT = True
        auth_utils.AI_MONTHLY_LIMIT = 0

    async def asyncTearDown(self):
        auth_utils.db = self.originals['utils_db']
        auth_routes.db = self.originals['routes_db']
        auth_utils.AI_CONSENT_ENFORCEMENT = self.originals['enforcement']
        auth_utils.AI_CONSENT_POLICY_VERSION = self.originals['utils_policy']
        auth_routes.AI_CONSENT_POLICY_VERSION = self.originals['routes_policy']
        auth_utils.AI_MONTHLY_LIMIT = self.originals['limit']
        auth_utils.is_admin = self.originals['is_admin']

    async def test_enforcement_refuses_before_quota_or_provider_path(self):
        with self.assertRaises(HTTPException) as caught:
            await auth_utils.check_ai_access('alice')

        self.assertEqual(caught.exception.status_code, 403)
        self.assertEqual(caught.exception.detail['code'], 'rook_ai_consent_required')
        self.assertEqual(self.usage.calls, [])

    async def test_admin_status_never_bypasses_privacy_consent(self):
        async def _is_admin(_username):
            return True

        auth_utils.is_admin = _is_admin
        auth_utils.AI_MONTHLY_LIMIT = 10

        with self.assertRaises(HTTPException) as caught:
            await auth_utils.check_ai_access('keeper-admin')

        self.assertEqual(caught.exception.detail['code'], 'rook_ai_consent_required')
        self.assertEqual(self.usage.calls, [])

    async def test_current_version_grant_allows_access(self):
        self.users.documents['alice']['rook_ai_consent'] = {
            'granted': True,
            'policy_version': 'rook-ai-test-v1',
            'updated_at': '2026-11-14T12:00:00+00:00',
        }

        self.assertTrue(await auth_utils.check_ai_access('alice'))
        status = await auth_utils.get_ai_consent_status('alice')
        self.assertTrue(status['granted'])
        self.assertTrue(status['required'])

    async def test_old_policy_grant_does_not_carry_forward(self):
        self.users.documents['alice']['rook_ai_consent'] = {
            'granted': True,
            'policy_version': 'rook-ai-old-v0',
            'updated_at': '2026-01-01T00:00:00+00:00',
        }

        status = await auth_utils.get_ai_consent_status('alice')

        self.assertFalse(status['granted'])
        self.assertIsNone(status['updated_at'])
        with self.assertRaises(HTTPException):
            await auth_utils.check_ai_access('alice')

    async def test_default_off_rollout_does_not_require_a_database_read(self):
        auth_utils.AI_CONSENT_ENFORCEMENT = False

        self.assertTrue(await auth_utils.check_ai_access('alice'))
        self.assertEqual(self.users.find_calls, [])

    async def test_update_can_only_change_the_authenticated_account(self):
        result = await auth_routes.update_rook_ai_consent(
            RookAiConsentUpdate(granted=True),
            username='alice',
        )

        self.assertTrue(result['granted'])
        self.assertEqual(self.users.update_calls[0][0], {'username': 'alice'})
        self.assertIn('rook_ai_consent', self.users.documents['alice'])
        self.assertNotIn('rook_ai_consent', self.users.documents['bob'])

        revoked = await auth_routes.update_rook_ai_consent(
            RookAiConsentUpdate(granted=False),
            username='alice',
        )
        self.assertFalse(revoked['granted'])

    async def test_missing_account_is_not_created_by_consent_update(self):
        with self.assertRaises(HTTPException) as caught:
            await auth_routes.update_rook_ai_consent(
                RookAiConsentUpdate(granted=True),
                username='missing-user',
            )

        self.assertEqual(caught.exception.status_code, 401)

    def test_consent_payload_requires_a_real_boolean(self):
        with self.assertRaises(ValidationError):
            RookAiConsentUpdate(granted='true')

    async def test_declining_ai_keeps_local_character_template_matching_available(self):
        async def _templates(_ruleset_id):
            return [{
                'id': 'local-fighter',
                'name': 'Local Fighter',
                'pitch': 'A reliable front-line hero.',
                'character_class': 'Fighter',
                'race': 'Human',
                'playstyle_tags': ['frontline', 'tank'],
            }]

        async def _consent_denied(_username, _feature='ai'):
            raise HTTPException(
                status_code=403,
                detail={'code': 'rook_ai_consent_required'},
            )

        character_templates._get_templates = _templates
        character_templates.get_llm_api_key = lambda _provider: 'configured-test-key'
        character_templates.check_ai_access = _consent_denied

        result = await character_templates.ai_match_template(
            TemplateMatchRequest(description='frontline tank'),
            username='alice',
        )

        self.assertEqual(result['best_match']['id'], 'local-fighter')
        self.assertIn('Playstyle tags', result['rationale'])


if __name__ == '__main__':
    unittest.main()
