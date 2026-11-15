"""GM auto-equip AC matches the frontend's equipment AC for the same
equipment (review findings 6-8): one shared list of cases."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.armor_class import armor_class_from_equipment, find_armor_rule  # noqa: E402
from utils.inventory_grant_helpers import character_armor_class_with_equipped  # noqa: E402

CASES = json.loads((Path(__file__).resolve().parents[2] / 'frontend/src/data/__fixtures__/armorClassCases.json').read_text())['cases']


@pytest.mark.parametrize('case', CASES, ids=[case['name'] for case in CASES])
def test_shared_armor_class_cases(case):
    assert armor_class_from_equipment(case['character'], case['equipped']) == case['ac']
    # The GM grant helper uses the same calculation.
    assert character_armor_class_with_equipped(case['character'], case['equipped']) == case['ac']


def test_studded_leather_is_its_own_armour():
    assert find_armor_rule({'name': 'Studded Leather Armor'})['key'] == 'StuddedLeather'
    assert find_armor_rule({'name': 'Leather Armor'})['key'] == 'Leather'
    assert find_armor_rule({'name': 'Leather Armor', 'armor_key': 'StuddedLeather'})['key'] == 'StuddedLeather'
