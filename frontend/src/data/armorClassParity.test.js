/**
 * The equipment AC a player's save persists matches GM auto-equip on the
 * backend for the same equipment (review findings 6-8): one shared list.
 */
import { deriveArmorClass } from './characterCombatDerivations';
import { findArmorRule } from './armorRules5e';
import fixture from './__fixtures__/armorClassCases.json';

describe('shared Armour Class cases', () => {
  test.each(fixture.cases.map((c) => [c.name, c]))('%s', (_name, c) => {
    expect(deriveArmorClass({ ...c.character, equipped: c.equipped }, { ignoreStoredAc: true })).toBe(c.ac);
  });
});

test('Studded Leather Armor is not plain Leather, and an explicit identity wins', () => {
  expect(findArmorRule({ name: 'Studded Leather Armor' }).key).toBe('StuddedLeather');
  expect(findArmorRule({ name: 'Leather Armor' }).key).toBe('Leather');
  expect(findArmorRule({ name: 'Studded Leather Armor +2' }).key).toBe('StuddedLeather');
  expect(findArmorRule({ name: 'Leather Armor', armor_key: 'StuddedLeather' }).key).toBe('StuddedLeather');
});
