import os
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

from routes.auth import normalize_username_for_auth


def test_normalize_username_accepts_safe_nicknames():
    assert normalize_username_for_auth('  Kid_Rogue-7  ') == 'Kid_Rogue-7'


@pytest.mark.parametrize('username', ['', 'ab', 'too long username for rook kids', 'kid@example.com', 'real name', 'name!'])
def test_normalize_username_rejects_unsafe_values(username):
    with pytest.raises(HTTPException) as exc:
        normalize_username_for_auth(username)

    assert exc.value.status_code == 400
    assert 'Username must be 3-24 characters' in exc.value.detail or exc.value.detail == 'Username is required'
