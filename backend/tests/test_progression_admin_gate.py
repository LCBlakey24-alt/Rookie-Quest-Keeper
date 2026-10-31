"""Regression tests: global progression writes must require a real admin.

The collections these endpoints write -- rule_systems, progression_classes,
progression_races, progression_features, feature_choices and
class_level_progressions -- are global reference data served to every player by
the level-up wizard, and rule_systems is additionally read by
get_campaign_rule_system and fed into AI prompts.

Six write endpoints had only Depends(get_current_user) (one of them an upsert
that overwrites existing global documents in place), and
/progression/seed-default-data was gated by a substring test against a
hardcoded list, so any username merely containing the word admin passed.
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

import routes.progression as progression

SOURCE = inspect.getsource(progression)
TREE = ast.parse(SOURCE)

# Global reference-data writes. /progression/character-features is excluded on
# purpose: it is per-character and already verifies ownership.
GLOBAL_WRITE_PATHS = {
    '/progression/systems',
    '/progression/classes',
    '/progression/races',
    '/progression/features',
    '/progression/feature-choices',
    '/progression/class-levels',
    '/progression/seed-default-data',
}


def _route_path(decorator):
    if not isinstance(decorator, ast.Call) or not decorator.args:
        return None
    arg = decorator.args[0]
    return arg.value if isinstance(arg, ast.Constant) else None


def _post_handlers():
    """Map each POST route path to its handler node."""
    found = {}
    for node in ast.walk(TREE):
        if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for dec in node.decorator_list:
            func = dec.func if isinstance(dec, ast.Call) else None
            if isinstance(func, ast.Attribute) and func.attr == 'post':
                path = _route_path(dec)
                if path:
                    found[path] = node
    return found


HANDLERS = _post_handlers()


def _calls_require_admin(node):
    for sub in ast.walk(node):
        if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) and sub.func.id == 'require_admin':
            return True
    return False


def test_every_expected_global_write_route_exists():
    # If a route is renamed, this test should fail loudly rather than silently
    # stop checking it.
    missing = GLOBAL_WRITE_PATHS - set(HANDLERS)
    assert not missing, f'expected POST routes not found: {sorted(missing)}'


@pytest.mark.parametrize('path', sorted(GLOBAL_WRITE_PATHS))
def test_global_write_requires_admin(path):
    assert _calls_require_admin(HANDLERS[path]), f'{path} does not call require_admin'


def test_character_scoped_write_is_not_admin_gated():
    # Players must still be able to save their own feature selections; an
    # over-broad fix would lock them out.
    node = HANDLERS['/progression/character-features']
    assert not _calls_require_admin(node)
    assert 'user_id' in ast.unparse(node), 'character write must stay ownership-scoped'


def test_substring_admin_check_is_gone():
    # The old gate accepted any username containing the word admin.
    assert 'admin_users = ' not in SOURCE
    assert 'admin in username.lower()' not in SOURCE


def test_require_admin_uses_the_shared_helper():
    # One definition of who is an admin, rather than a per-module list.
    assert 'from utils.auth import get_current_user, is_admin' in SOURCE
    src = inspect.getsource(progression.require_admin)
    assert 'await is_admin(username)' in src
    assert '403' in src or 'HTTP_403_FORBIDDEN' in src
