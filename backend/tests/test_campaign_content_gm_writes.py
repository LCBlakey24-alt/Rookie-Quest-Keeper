"""Regression tests: only the GM may write campaign homebrew content.

Every create path in campaign_content.py gated on verify_campaign_membership,
so any member could inject races, classes, subclasses, backgrounds and feats
into a GM's campaign -- including a bulk-upload of a whole ruleset -- and then
legitimately select the result. An arbitrarily overpowered class or feat could
be self-granted.

The module already treated the GM as the authority everywhere else: the delete
path checks `is_gm or is_creator` and returns 403 otherwise, which is what made
the creates look like an oversight rather than a design choice.

Reads stay on membership: players legitimately need to see campaign content.
"""
import ast
import inspect
import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'rook_test')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import routes.campaign_content as campaign_content

TREE = ast.parse(inspect.getsource(campaign_content))

WRITE_PATHS = {
    '/campaigns/{campaign_id}/content/bulk-upload',
    '/campaigns/{campaign_id}/content/races',
    '/campaigns/{campaign_id}/content/classes',
    '/campaigns/{campaign_id}/content/subclasses',
    '/campaigns/{campaign_id}/content/backgrounds',
    '/campaigns/{campaign_id}/content/feats',
}

READ_PATHS = {
    '/campaigns/{campaign_id}/content',
    '/campaigns/{campaign_id}/content/races',
    '/campaigns/{campaign_id}/content/classes',
    '/campaigns/{campaign_id}/content/subclasses',
    '/campaigns/{campaign_id}/content/backgrounds',
    '/campaigns/{campaign_id}/content/feats',
}


def _handlers():
    """Map (method, path) -> handler node for every route in the module."""
    found = {}
    for node in ast.walk(TREE):
        if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for dec in node.decorator_list:
            if not isinstance(dec, ast.Call):
                continue
            func = dec.func
            if not isinstance(func, ast.Attribute) or not dec.args:
                continue
            arg = dec.args[0]
            if isinstance(arg, ast.Constant):
                found[(func.attr, arg.value)] = node
    return found


HANDLERS = _handlers()


def _calls(node, name):
    return any(
        isinstance(sub, ast.Call)
        and isinstance(sub.func, ast.Name)
        and sub.func.id == name
        for sub in ast.walk(node)
    )


class TestWritesRequireTheGM:
    def test_all_expected_write_routes_exist(self):
        # A rename should fail loudly rather than quietly stop being checked.
        missing = {p for p in WRITE_PATHS if ('post', p) not in HANDLERS}
        assert not missing, f'POST routes not found: {sorted(missing)}'

    @pytest.mark.parametrize('path', sorted(WRITE_PATHS))
    def test_write_requires_ownership(self, path):
        node = HANDLERS[('post', path)]
        assert _calls(node, 'verify_campaign_ownership'), f'POST {path} does not require the GM'

    @pytest.mark.parametrize('path', sorted(WRITE_PATHS))
    def test_write_does_not_settle_for_membership(self, path):
        node = HANDLERS[('post', path)]
        assert not _calls(node, 'verify_campaign_membership'), f'POST {path} still accepts any member'


class TestReadsStayOpenToMembers:
    @pytest.mark.parametrize('path', sorted(READ_PATHS))
    def test_read_uses_membership(self, path):
        # Players must still be able to see campaign content; an over-broad fix
        # would lock them out of their own campaign's races and classes.
        node = HANDLERS[('get', path)]
        assert _calls(node, 'verify_campaign_membership'), f'GET {path} should allow members'
        assert not _calls(node, 'verify_campaign_ownership'), f'GET {path} should not be GM-only'


class TestDeleteKeepsItsOwnRule:
    def test_delete_still_allows_the_creator(self):
        node = HANDLERS[('delete', '/campaigns/{campaign_id}/content/{content_type}/{content_id}')]
        source = ast.unparse(node)
        # GM or original creator, which is the pattern the writes now follow.
        assert 'dm_user_id' in source
        assert 'created_by' in source
        assert '403' in source or 'HTTP_403' in source
