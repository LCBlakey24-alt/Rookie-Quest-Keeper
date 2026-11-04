"""A child account reaches only what it is explicitly allowed to reach."""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "rookie_quest_keeper_test")
os.environ.setdefault("JWT_SECRET_KEY", "child-access-test-secret")
os.environ.setdefault("APP_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

import jwt  # noqa: E402

from config import JWT_ALGORITHM, JWT_SECRET  # noqa: E402
from utils.auth import create_token  # noqa: E402
from utils.child_access import (  # noqa: E402
    ACCOUNT_TYPE_CLAIM,
    CHILD_ACCOUNT_TYPE,
    account_type_from_token,
    bearer_token,
    child_may_reach,
)


def claims(token):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


class TestTheTokenCarriesTheAccountType:
    def test_an_adult_token_is_unchanged(self):
        """No claim is added, so nothing has to be reissued for existing users."""
        assert ACCOUNT_TYPE_CLAIM not in claims(create_token('rowan', 2))
        assert ACCOUNT_TYPE_CLAIM not in claims(create_token('rowan', 2, 'adult'))

    def test_a_child_token_says_so(self):
        assert claims(create_token('lewis.rowan', 0, 'child'))[ACCOUNT_TYPE_CLAIM] == 'child'

    def test_a_missing_claim_reads_as_adult(self):
        """Every token issued before this change has no claim."""
        assert account_type_from_token(create_token('rowan')) == 'adult'

    def test_a_child_claim_is_read_back(self):
        assert account_type_from_token(create_token('kid', 0, 'child')) == CHILD_ACCOUNT_TYPE

    def test_an_unreadable_token_is_not_treated_as_a_child(self):
        """The gate must never be what decides somebody is signed in.

        A forged or expired token is passed to the route to reject in the
        normal way, rather than being quietly handled here.
        """
        assert account_type_from_token('not-a-token') is None
        assert account_type_from_token('') is None
        assert account_type_from_token(None) is None
        forged = jwt.encode({'sub': 'kid', ACCOUNT_TYPE_CLAIM: 'child'}, 'wrong-secret', algorithm=JWT_ALGORITHM)
        assert account_type_from_token(forged) is None


class TestWhatAChildMayReach:
    def test_their_own_character_sheets(self):
        assert child_may_reach('GET', '/api/characters')
        assert child_may_reach('GET', '/api/characters/abc-123')
        assert child_may_reach('POST', '/api/characters')
        assert child_may_reach('PUT', '/api/characters/abc-123')
        assert child_may_reach('PATCH', '/api/characters/abc-123')

    def test_building_and_levelling_a_character(self):
        assert child_may_reach('GET', '/api/progression/classes')
        assert child_may_reach('POST', '/api/progression/level-up')
        assert child_may_reach('GET', '/api/srd/spells')
        assert child_may_reach('GET', '/api/rule-systems')
        assert child_may_reach('GET', '/api/character-templates')

    def test_following_live_play(self):
        assert child_may_reach('GET', '/api/campaigns/camp-1/display-state')
        assert child_may_reach('POST', '/api/campaigns/camp-1/display-state/ack')

    def test_signing_in_and_out(self):
        assert child_may_reach('POST', '/api/auth/login')
        assert child_may_reach('POST', '/api/auth/logout')
        assert child_may_reach('POST', '/api/auth/change-password')


class TestWhatAChildMayNot:
    def test_not_the_admin_area(self):
        assert not child_may_reach('GET', '/api/admin/users')
        assert not child_may_reach('POST', '/api/admin/site-settings')

    def test_not_the_ai(self):
        """Rook needs a restricted sheet-help surface before a child gets it.

        Until that exists, the open assistant stays closed to them.
        """
        assert not child_may_reach('POST', '/api/ai/generate')
        assert not child_may_reach('POST', '/api/rook/chat')

    def test_not_account_management(self):
        """Changing an email, or deleting the account, belongs to the parent."""
        assert not child_may_reach('DELETE', '/api/user/account')
        assert not child_may_reach('PUT', '/api/user/email')

    def test_not_publishing_to_the_shared_screen(self):
        """Reading Live Play is allowed; driving the table's screen is not."""
        assert not child_may_reach('PUT', '/api/campaigns/camp-1/display-state')

    def test_not_the_rest_of_a_campaign(self):
        """Allowing the display-state path must not open the campaign tree."""
        assert not child_may_reach('GET', '/api/campaigns/camp-1/quests')
        assert not child_may_reach('GET', '/api/campaigns/camp-1/npcs')
        assert not child_may_reach('POST', '/api/campaigns')
        assert not child_may_reach('DELETE', '/api/campaigns/camp-1')

    def test_not_sharing_surfaces(self):
        assert not child_may_reach('POST', '/api/homebrew/rulesets')
        assert not child_may_reach('POST', '/api/reviews')
        assert not child_may_reach('POST', '/api/feedback')

    def test_a_route_nobody_has_thought_about_is_closed(self):
        """The point of the design: new routes are denied until listed.

        If this ever starts passing, the gate has been inverted and every
        future route is open to children by default.
        """
        assert not child_may_reach('POST', '/api/billing/subscribe')
        assert not child_may_reach('GET', '/api/some-feature-added-next-year')

    def test_deleting_is_never_allowed_even_on_an_allowed_path(self):
        """DELETE is in no allowlist entry, so it cannot be reached at all."""
        assert not child_may_reach('DELETE', '/api/characters/abc-123')
        assert not child_may_reach('DELETE', '/api/progression/abc')


class TestPathHandling:
    def test_a_trailing_slash_does_not_change_the_answer(self):
        assert child_may_reach('GET', '/api/characters/')
        assert not child_may_reach('GET', '/api/admin/')

    def test_the_api_mount_is_optional(self):
        """Middleware sees the mounted path; tests and tools may not."""
        assert child_may_reach('GET', '/characters')
        assert not child_may_reach('GET', '/admin/users')

    def test_a_prefix_must_match_a_whole_segment(self):
        """`/characters` must not open `/characters-admin`."""
        assert not child_may_reach('GET', '/api/characters-admin')
        assert not child_may_reach('GET', '/api/playerzone')


class TestBearerParsing:
    def test_reads_a_bearer_header(self):
        assert bearer_token({'authorization': 'Bearer abc.def.ghi'}) == 'abc.def.ghi'

    def test_ignores_other_schemes_and_junk(self):
        assert bearer_token({'authorization': 'Basic abc'}) is None
        assert bearer_token({'authorization': 'Bearer '}) is None
        assert bearer_token({}) is None


class TestTheMiddlewareActuallyBlocks:
    """The matcher above is logic; this proves it is wired into a request.

    A gate that is correct but not mounted protects nothing, so these run
    real requests through the middleware rather than calling the matcher.
    """

    @staticmethod
    def _app():
        from fastapi import FastAPI
        from utils.child_access import ChildAccountMiddleware

        app = FastAPI()
        app.add_middleware(ChildAccountMiddleware)

        @app.get('/api/characters')
        def characters():
            return {'ok': 'sheet'}

        @app.get('/api/admin/users')
        def admin_users():
            return {'ok': 'admin'}

        @app.post('/api/campaigns')
        def make_campaign():
            return {'ok': 'campaign'}

        return app

    def _client(self):
        from fastapi.testclient import TestClient
        return TestClient(self._app())

    @staticmethod
    def _auth(token):
        return {'Authorization': f'Bearer {token}'}

    def test_a_child_reaches_their_sheet(self):
        client = self._client()
        response = client.get('/api/characters', headers=self._auth(create_token('kid', 0, 'child')))
        assert response.status_code == 200

    def test_a_child_is_refused_the_admin_area(self):
        client = self._client()
        response = client.get('/api/admin/users', headers=self._auth(create_token('kid', 0, 'child')))
        assert response.status_code == 403
        assert 'cannot use that part' in response.json()['detail']

    def test_a_child_is_refused_creating_a_campaign(self):
        client = self._client()
        response = client.post('/api/campaigns', headers=self._auth(create_token('kid', 0, 'child')))
        assert response.status_code == 403

    def test_an_adult_is_unaffected_everywhere(self):
        """The gate must be invisible to every existing account."""
        client = self._client()
        adult = self._auth(create_token('lewis', 3))
        assert client.get('/api/characters', headers=adult).status_code == 200
        assert client.get('/api/admin/users', headers=adult).status_code == 200
        assert client.post('/api/campaigns', headers=adult).status_code == 200

    def test_an_anonymous_request_is_left_to_the_route(self):
        """No token is not the gate's business; the route still authenticates."""
        client = self._client()
        assert client.get('/api/admin/users').status_code == 200
