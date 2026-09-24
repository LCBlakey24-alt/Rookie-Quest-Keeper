import os
import sys
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes.homebrew import _build_template, _normalise_content_type, _normalise_parsed


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


def test_feat_parser_preserves_explicit_origin_category():
    parsed = _normalise_parsed('feat', {
        'name': 'Village Hero',
        'category': 'Origin',
        'description': 'A level 1 story feat.',
        'benefits': ['Gain a heroic contact.'],
    }, '2024')

    assert parsed['category'] == 'origin'
    assert parsed['content_type'] == 'feat'
    assert parsed['edition'] == '2024'


def test_feat_parser_detects_epic_boons_from_prerequisites():
    parsed = _normalise_parsed('feat', {
        'name': 'Mythic Scarab Soul',
        'prerequisite': '19th-level character',
        'tags': ['Epic Boon'],
        'description': 'You become mythic.',
        'benefits': ['Increase one ability score.'],
    }, '2024')

    assert parsed['category'] == 'epic'


def test_feat_parser_defaults_unclear_feats_to_general():
    parsed = _normalise_parsed('feat', {
        'name': 'Shield-Breaker',
        'description': 'You punish guarded enemies.',
        'benefits': ['Push a shield-bearing target 5 feet once per turn.'],
    }, '2014')

    assert parsed['category'] == 'general'


def test_spell_parser_splits_mixed_class_separator_strings():
    parsed = _normalise_parsed('spell', {
        'name': 'Ashen Rebuke',
        'classes': 'Wizard; Warlock | Cleric and Bard',
    }, '2024')

    assert parsed['classes'] == ['Wizard', 'Warlock', 'Cleric', 'Bard']
    assert parsed['content_type'] == 'spell'
    assert parsed['edition'] == '2024'


def test_spell_parser_accepts_class_alias_fields():
    parsed = _normalise_parsed('spell', {
        'name': 'Verdant Starfall',
        'spellClasses': ['druid', 'ranger', 'sorcerer'],
    }, '2014')

    assert parsed['classes'] == ['Druid', 'Ranger', 'Sorcerer']


def test_spell_parser_accepts_dictionary_class_maps():
    parsed = _normalise_parsed('spell', {
        'name': 'Clockwork Ward',
        'classes': {'wizard': True, 'cleric': False, 'artificer': True},
    }, '2024')

    assert parsed['classes'] == ['Wizard', 'Artificer']


def test_class_template_exposes_spellcasting_definition():
    template = _build_template('class', '2024')

    assert '## Spellcasting' in template
    assert 'progression: full|half|third|pact' in template


def test_class_parser_preserves_spellcasting_metadata():
    spellcasting = {
        'ability': 'intelligence',
        'type': 'known',
        'progression': 'full',
        'start_level': 1,
        'cantrips_level_1': 2,
        'spells_level_1': 3,
        'ritual': False,
    }
    parsed = _normalise_parsed('class', {
        'name': 'Runesmith',
        'hit_die': 'd8',
        'features': [{'level': 1, 'name': 'Rune Magic'}],
        'spellcasting': spellcasting,
    }, '2024')

    assert parsed['spellcasting'] == spellcasting
    assert parsed['content_type'] == 'class'
    assert parsed['edition'] == '2024'
