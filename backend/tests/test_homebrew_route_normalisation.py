import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes.homebrew import _normalise_content_type, _normalise_parsed


def test_homebrew_content_type_aliases_match_workshop_labels():
    assert _normalise_content_type('species') == 'race'
    assert _normalise_content_type('magic item') == 'magic_item'
    assert _normalise_content_type('custom-rule') == 'custom_rule'
    assert _normalise_content_type('sub class') == 'subclass'


def test_subclass_parser_accepts_common_parent_class_aliases():
    parsed = _normalise_parsed('subclass', {
        'name': 'The Gilded Scarab',
        'baseClass': 'Warlock',
        'features': [{'level': 1, 'name': 'Gilded Pact'}],
    }, '2024')

    assert parsed['parent_class'] == 'Warlock'
    assert parsed['content_type'] == 'subclass'
    assert parsed['edition'] == '2024'


def test_magic_item_parser_accepts_item_type_alias():
    parsed = _normalise_parsed('magic_item', {
        'name': 'Coin of the Scarab King',
        'item_type': 'Wondrous Item',
        'rarity': 'rare',
    }, '2014')

    assert parsed['type'] == 'Wondrous Item'
    assert parsed['content_type'] == 'magic_item'
    assert parsed['edition'] == '2014'
