import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'test')
os.environ.setdefault('JWT_SECRET_KEY', 'test')
os.environ.setdefault('APP_URL', 'http://localhost:3000')
os.environ.setdefault('CORS_ORIGINS', 'http://localhost:3000')

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Importing routes registers the focused safe-field extension used by the app.
import routes  # noqa: F401
from routes.character_patch import _clean_create, _clean_patch


class CharacterClassChoicePersistenceTests(unittest.TestCase):
    def test_creator_class_choices_survive_character_creation(self):
        payload = {
            'name': 'Beta Hero',
            'race': 'Human',
            'character_class': 'Warlock',
            'level': 11,
            'expertise': ['Stealth', 'Perception'],
            'expertise_skills': ['Stealth', 'Perception'],
            'metamagic_options': ['Quickened Spell', 'Subtle Spell'],
            'sorcery_points': '11',
            'sorcery_points_remaining': '7',
            'battle_master_maneuvers': ['Riposte', 'Precision Attack'],
            'superiority_dice': {'die': 'd8', 'total': 4, 'remaining': 2},
            'pact_boon': 'Pact of the Blade',
            'eldritch_invocations': ['Agonizing Blast', 'Devil’s Sight'],
            'mystic_arcanum': [{'name': 'Mass Suggestion', 'level': 6}],
            'should_not_persist': 'unsafe extra field',
        }

        created = _clean_create(payload, 'beta-user')

        self.assertEqual(created['expertise'], ['Stealth', 'Perception'])
        self.assertEqual(created['expertise_skills'], ['Stealth', 'Perception'])
        self.assertEqual(created['metamagic_options'], ['Quickened Spell', 'Subtle Spell'])
        self.assertEqual(created['sorcery_points'], 11)
        self.assertEqual(created['sorcery_points_remaining'], 7)
        self.assertEqual(created['battle_master_maneuvers'], ['Riposte', 'Precision Attack'])
        self.assertEqual(created['superiority_dice']['remaining'], 2)
        self.assertEqual(created['pact_boon'], 'Pact of the Blade')
        self.assertEqual(created['eldritch_invocations'], ['Agonizing Blast', 'Devil’s Sight'])
        self.assertEqual(created['mystic_arcanum'][0]['name'], 'Mass Suggestion')
        self.assertNotIn('should_not_persist', created)

    def test_sheet_patch_preserves_class_choices_and_zero_resource_counts(self):
        patch = _clean_patch({
            'expertise_choices': ['Arcana'],
            'metamagic': ['Twinned Spell'],
            'sorcery_points_remaining': 0,
            'combat_maneuvers': ['Trip Attack'],
            'superiority_dice': {'die': 'd10', 'total': 5, 'remaining': 0},
            'pactBoon': 'Pact of the Tome',
            'invocations': ['Book of Ancient Secrets'],
            'mystic_arcanum': [{'name': 'Forcecage', 'level': 7}],
        })

        self.assertEqual(patch['expertise_choices'], ['Arcana'])
        self.assertEqual(patch['metamagic'], ['Twinned Spell'])
        self.assertEqual(patch['sorcery_points_remaining'], 0)
        self.assertEqual(patch['combat_maneuvers'], ['Trip Attack'])
        self.assertEqual(patch['superiority_dice']['remaining'], 0)
        self.assertEqual(patch['pactBoon'], 'Pact of the Tome')
        self.assertEqual(patch['invocations'], ['Book of Ancient Secrets'])
        self.assertEqual(patch['mystic_arcanum'][0]['level'], 7)


if __name__ == '__main__':
    unittest.main()
