import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes.characters import model_update_payload, passthrough_character_fields
from models import PlayerCharacterUpdate


def test_homebrew_resource_payload_is_split_before_model_validation():
    payload = {
        'name': 'Javen Crow',
        'level': 9,
        'resources': {
            'scarab_charges': {
                'label': 'Scarab Charges',
                'current': 2,
                'remaining': 2,
                'max': 9,
                'restore': 'long-rest',
            }
        },
        'homebrew_resources': [
            {'name': 'Scarab Charges', 'formula': 'Warlock level', 'restore': 'long rest'},
            {'name': 'Greed Tokens', 'formula': 'proficiency bonus', 'restore': 'short rest'},
        ],
        'homebrew_actions': [
            {'name': 'Spend Greed Token', 'action_type': 'bonus action'},
        ],
        'passive_effects': [
            {'name': 'Gilded Instinct', 'description': 'Homebrew passive effect.'},
        ],
    }

    model_payload = model_update_payload(payload)
    passthrough = passthrough_character_fields(payload)

    assert 'resources' not in model_payload
    assert 'homebrew_resources' not in model_payload
    validated = PlayerCharacterUpdate.model_validate(model_payload)
    assert validated.name == 'Javen Crow'
    assert validated.level == 9
    assert passthrough['resources']['scarab_charges']['max'] == 9
    assert passthrough['homebrew_resources'][1]['name'] == 'Greed Tokens'
    assert passthrough['homebrew_actions'][0]['name'] == 'Spend Greed Token'
    assert passthrough['passive_effects'][0]['name'] == 'Gilded Instinct'


def test_normal_updates_still_validate_after_passthrough_split():
    payload = {
        'current_hit_points': 21,
        'temporary_hit_points': 5,
        'conditions': ['poisoned'],
        'resources': {
            'greed_tokens': {
                'label': 'Greed Tokens',
                'current': 1,
                'remaining': 1,
                'max': 4,
                'restore': 'short-rest',
            }
        },
    }

    validated = PlayerCharacterUpdate.model_validate(model_update_payload(payload))
    passthrough = passthrough_character_fields(payload)

    assert validated.current_hit_points == 21
    assert validated.temporary_hit_points == 5
    assert validated.conditions == ['poisoned']
    assert passthrough['resources']['greed_tokens']['restore'] == 'short-rest'
