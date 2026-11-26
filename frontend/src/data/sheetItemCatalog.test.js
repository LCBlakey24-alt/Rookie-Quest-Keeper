import { ALL_WEAPONS } from './srdEquipment';
import {
  SHEET_ITEM_CATALOG, customInventoryItem, hasSheetItem, inventoryItemFromCatalog, searchSheetItems,
} from './sheetItemCatalog';

describe('sheet item catalogue', () => {
  test('every SRD weapon becomes a real weapon the sheet can attack with', () => {
    const weapons = SHEET_ITEM_CATALOG.filter((item) => item.kind === 'Weapon');
    expect(weapons).toHaveLength(ALL_WEAPONS.length);
    weapons.forEach((weapon) => {
      const item = inventoryItemFromCatalog(weapon);
      expect(item.item_type).toBe('weapon');
      expect(item.damage).toBeTruthy();
      expect(item.id).toBeTruthy();
      expect(item.equipped).toBe(false);
    });
  });

  test('armour and the shield carry what Armour Class needs', () => {
    const chain = inventoryItemFromCatalog(SHEET_ITEM_CATALOG.find((item) => item.name === 'Chain mail'));
    expect(chain.item_type).toBe('armor');
    expect(chain.armor_class).toBe(16);
    const shield = inventoryItemFromCatalog(SHEET_ITEM_CATALOG.find((item) => item.kind === 'Shield'));
    expect(shield.item_type).toBe('shield');
  });

  test('gear is a plain carried item with its weight', () => {
    const rope = SHEET_ITEM_CATALOG.find((item) => /rope/i.test(item.name));
    const item = inventoryItemFromCatalog(rope);
    expect(item.item_type).toBe('item');
    expect(item.weight).toBe(rope.weight);
    expect(item.source).toBe('srd_5_1');
  });

  test('search puts names that start with the text first, and is limited', () => {
    const results = searchSheetItems('long');
    expect(results[0].name.toLowerCase().startsWith('long')).toBe(true);
    expect(results.map((item) => item.name)).toEqual(expect.arrayContaining(['Longsword', 'Longbow']));
    expect(searchSheetItems('', 5)).toHaveLength(5);
    expect(searchSheetItems('zzzz')).toEqual([]);
    expect(searchSheetItems('shield').some((item) => item.kind === 'Shield')).toBe(true);
  });

  test('a custom item is a name only: nothing is invented for it', () => {
    const key = customInventoryItem('  Strange   brass key ');
    expect(key).toMatchObject({ name: 'Strange brass key', item_type: 'item', quantity: 1, source: 'user_original' });
    expect(key.damage).toBeUndefined();
    expect(customInventoryItem('   ')).toBeNull();
    expect(hasSheetItem('dagger')).toBe(true);
    expect(hasSheetItem('Strange brass key')).toBe(false);
  });

  test('two added copies of one item get different ids', () => {
    const dagger = SHEET_ITEM_CATALOG.find((item) => item.name === 'Dagger');
    expect(inventoryItemFromCatalog(dagger).id).not.toBe(inventoryItemFromCatalog(dagger).id);
  });
});
