import importlib.util
import sys
import types
from pathlib import Path

sys.modules.setdefault('config', types.SimpleNamespace(db=None, logger=None))
sys.modules.setdefault('utils', types.ModuleType('utils'))
sys.modules.setdefault('utils.auth', types.SimpleNamespace(get_current_user=lambda: None, verify_campaign_ownership=None, verify_campaign_membership=None))
sys.modules.setdefault('models', types.SimpleNamespace(
    InventoryItem=dict,
    InventoryItemCreate=object,
    InventoryItemUpdate=object,
    PartyCurrency=dict,
    PartyCurrencyUpdate=object,
    CustomItem=dict,
    CustomItemCreate=object,
    CustomItemUpdate=object,
))

spec = importlib.util.spec_from_file_location('inventory_route_under_test', Path(__file__).resolve().parents[1] / 'routes' / 'inventory.py')
inventory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inventory)

character_armor_class_with_equipped = inventory.character_armor_class_with_equipped
infer_equip_slot = inventory.infer_equip_slot
item_inventory_entry = inventory.item_inventory_entry


def character(dexterity=14):
    return {'dexterity': dexterity}


def item(name, item_type='armor', ac_bonus=0):
    return {'name': name, 'item_type': item_type, 'type': item_type, 'ac_bonus': ac_bonus}


def test_common_armour_and_shield_ac_cases():
    assert character_armor_class_with_equipped(character(), {'armor': item('Leather Armour')}) == 13
    assert character_armor_class_with_equipped(character(), {'armor': item('Chain Mail')}) == 16
    assert character_armor_class_with_equipped(character(), {'shield': item('Shield', 'shield', 2)}) == 14
    assert character_armor_class_with_equipped(character(), {'armor': item('Chain Mail'), 'shield': item('Shield', 'shield', 2)}) == 18
    assert character_armor_class_with_equipped(character(), {'armor': item('Plate'), 'shield': item('Shield', 'shield', 2)}) == 20


def test_gm_grant_auto_equip_armour_updates_ac_input_shape():
    grant = item_inventory_entry(item('Chain Mail'), recipient_name='Hero', auto_equip=True)
    assert grant['equipped'] is True
    assert grant['equipped_slot'] == 'armor'
    assert character_armor_class_with_equipped(character(), {'armor': grant}) == 16


def test_gm_grant_auto_equip_shield_updates_ac_input_shape():
    shield = item_inventory_entry(item('Shield', 'shield', 2), recipient_name='Hero', auto_equip=True)
    assert shield['equipped'] is True
    assert shield['equipped_slot'] == 'shield'
    assert infer_equip_slot(shield) == 'shield'
    assert character_armor_class_with_equipped(character(), {'shield': shield}) == 14
