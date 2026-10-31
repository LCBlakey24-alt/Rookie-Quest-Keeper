"""Regression tests: a new account must not be able to alias a privileged one.

Admin identity is resolved case-insensitively (utils.auth.is_admin lowercases
before comparing against ADMIN_USERNAMES), but username uniqueness was enforced
case-sensitively and the unique index carries no collation. Registering
"lcblakey24" while the admin held "LCBlakey24" therefore produced a second,
distinct account that satisfied every admin check -- which unlocked
POST /admin/users/{username}/impersonate and a valid token for any account.
"""
import os
import re
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import ADMIN_USERNAMES, RESERVED_USERNAMES
from routes.auth import normalize_username_for_auth, username_alias_query
from routes.auth_login_fast import normalize_google_username


class TestReservedNamesAreEnforced:
    """RESERVED_USERNAMES existed in config.py but was never referenced."""

    @pytest.mark.parametrize('name', sorted(RESERVED_USERNAMES))
    def test_password_registration_rejects_every_reserved_name(self, name):
        with pytest.raises(HTTPException) as exc:
            normalize_username_for_auth(name)
        assert exc.value.status_code == 400
        assert 'reserved' in exc.value.detail.lower()

    @pytest.mark.parametrize('name', sorted(RESERVED_USERNAMES))
    def test_google_signup_rejects_every_reserved_name(self, name):
        # Google sign-up is a second account-creation path and needs the
        # same guard, or the identity could just be claimed through it.
        with pytest.raises(HTTPException) as exc:
            normalize_google_username(name)
        assert exc.value.status_code == 400
        assert 'reserved' in exc.value.detail.lower()

    def test_configured_admins_are_covered(self):
        # The whole point: the real admin's name must be reserved.
        for admin in ADMIN_USERNAMES:
            assert admin.lower() in RESERVED_USERNAMES

    @pytest.mark.parametrize('variant', ['LCBlakey24', 'lcblakey24', 'LCBLAKEY24', 'lCbLaKeY24'])
    def test_case_variants_of_an_admin_name_are_all_rejected(self, variant):
        # The exploit used capitalisation to dodge an exact-match check, so
        # every casing of a reserved name must be refused.
        if variant.lower() not in RESERVED_USERNAMES:
            pytest.skip('default admin name not configured in this environment')
        with pytest.raises(HTTPException) as exc:
            normalize_username_for_auth(variant)
        assert exc.value.status_code == 400

    @pytest.mark.parametrize('name', ['Kid_Rogue-7', 'tavern_keeper', 'Dice-Goblin'])
    def test_ordinary_names_still_accepted(self, name):
        assert normalize_username_for_auth(name) == name


class TestCollisionCheckIsCaseInsensitive:
    """The registration lookup must not be a case-sensitive exact match."""

    def test_query_matches_any_casing_of_the_same_name(self):
        query = username_alias_query('LCBlakey24')
        pattern = query['username']['$regex']
        assert query['username']['$options'] == 'i'
        compiled = re.compile(pattern, re.IGNORECASE)
        for variant in ('LCBlakey24', 'lcblakey24', 'LCBLAKEY24', 'lCbLaKeY24'):
            assert compiled.fullmatch(variant), f'{variant} should collide'

    def test_query_is_anchored_so_it_cannot_match_substrings(self):
        compiled = re.compile(username_alias_query('rook')['username']['$regex'], re.IGNORECASE)
        assert compiled.fullmatch('rook')
        for other in ('rookie', 'brook', 'the_rook_1'):
            assert not compiled.fullmatch(other), f'{other} must not collide with "rook"'

    def test_regex_metacharacters_in_a_username_are_escaped(self):
        # SAFE_USERNAME_RE allows '-' and '_'; escaping keeps the query literal
        # even if that set ever widens, so a crafted name cannot alter matching.
        compiled = re.compile(username_alias_query('a-b_c')['username']['$regex'], re.IGNORECASE)
        assert compiled.fullmatch('A-B_C')
        assert not compiled.fullmatch('axbyc')
