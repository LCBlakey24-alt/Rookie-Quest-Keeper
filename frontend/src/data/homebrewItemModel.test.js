import { emptyItemDraft, toSheetItem, itemDraftWarnings, sheetEffectLines } from './homebrewItemModel';
import { previewItemOnSheet } from './homebrewItemPreview';
import { rollDiceNotation } from './diceRoller';

const weapon = (patch = {}) => ({ ...emptyItemDraft('weapon'), name: 'Synthetic Emberblade', ...patch, weapon: { ...emptyItemDraft('weapon').weapon, ...(patch.weapon || {}) } });

describe('weapons become sheet items the sheet already understands', () => {
  test('a plain martial melee weapon uses Strength and proficiency', () => {
    const item = toSheetItem(weapon());
    expect(item).toMatchObject({ type: 'Weapon', damage: '1d8', damage_type: 'slashing', attack_ability: 'strength', weapon_category: 'martial_melee' });
    const { attack } = previewItemOnSheet(item, { strength: 16, dexterity: 14, proficiencyBonus: 2 });
    expect(attack.attackMod).toBe(5); // +3 STR +2 proficiency
    expect(attack.damageNotation).toBe('1d8+3');
  });

  test('finesse picks the better of Strength and Dexterity', () => {
    const item = toSheetItem(weapon({ weapon: { properties: ['finesse', 'light'], dice_sides: 6, damage_type: 'piercing' } }));
    const { attack } = previewItemOnSheet(item, { strength: 10, dexterity: 18, proficiencyBonus: 2 });
    expect(attack.attackMod).toBe(6);
    expect(attack.damageNotation).toBe('1d6+4');
  });

  test('a ranged weapon uses Dexterity and shows its range', () => {
    const item = toSheetItem(weapon({ weapon: { reach: 'ranged', range_normal: 80, range_long: 320, dice_sides: 6, damage_type: 'piercing', properties: ['ammunition'] } }));
    expect(item.range).toBe('Ranged (80/320 ft.)');
    const { attack } = previewItemOnSheet(item, { strength: 16, dexterity: 12, proficiencyBonus: 3 });
    expect(attack.attackMod).toBe(4);
  });

  test('a +1 weapon with extra fire damage and a versatile die', () => {
    const item = toSheetItem(weapon({ weapon: { magic_bonus: 1, properties: ['versatile'], versatile_sides: 10, extra_damage: [{ dice: '1d6', type: 'fire' }, { dice: 'lots', type: 'cold' }] } }));
    expect(item.extra_damage).toEqual([{ dice: '1d6', type: 'fire' }]);
    expect(item.versatile_damage).toBe('1d10');
    const { attack } = previewItemOnSheet(item);
    expect(attack.toHitText).toBe('+6');
    expect(attack.damageNotation).toBe('1d8+4');
    expect(attack.versatileNotation).toBe('1d10+4');
    expect(attack.damageText).toContain('+ 1d6 fire');
    // Every notation the preview offers can actually be rolled.
    [attack.toHitNotation, attack.damageNotation, attack.versatileNotation, '1d6'].forEach(n => expect(rollDiceNotation(n).total).toBeGreaterThan(0));
  });
});

describe('armour and shields set AC on the sheet', () => {
  const armour = (armour_type, base_ac, magic_bonus = 0) => toSheetItem({ ...emptyItemDraft('armour'), name: 'Synthetic Drakehide', armour: { armour_type, base_ac, magic_bonus } });
  test.each([
    ['light', 12, 0, 16],  // 12 + DEX 4
    ['medium', 14, 0, 16], // 14 + DEX capped at 2
    ['heavy', 17, 1, 18],  // 17, no DEX, +1 magic
  ])('%s armour base %i (+%i) with DEX 18 gives AC %i', (type, base, magic, expected) => {
    expect(previewItemOnSheet(armour(type, base, magic), { strength: 10, dexterity: 18 }).armourClass).toBe(expected);
  });

  test('a custom shield adds its own bonus plus magic', () => {
    const shield = toSheetItem({ ...emptyItemDraft('shield'), name: 'Synthetic Tower Board', shield: { ac_bonus: 3, magic_bonus: 1 } });
    expect(previewItemOnSheet(shield, { strength: 10, dexterity: 10 }).armourClass).toBe(14);
  });
});

describe('defences and bonuses are spelled out', () => {
  test('resistances, immunities, saves and ability bonuses', () => {
    const item = toSheetItem({ ...emptyItemDraft('wearable'), name: 'Synthetic Ring', requires_attunement: true,
      bonuses: { ac: 1, saves: 1, abilities: { constitution: 2 } },
      defences: { resistances: ['fire'], immunities: ['poison'], vulnerabilities: [], condition_immunities: ['charmed'] },
      charges: { max: 3, recharge: '1d3 at dawn' } });
    expect(item).toMatchObject({ damage_resistances: ['fire'], damage_immunities: ['poison'], condition_immunities: ['charmed'], ac_bonus: 1, save_bonus: 1, charges_max: 3 });
    expect(sheetEffectLines(item)).toEqual(expect.arrayContaining([
      'Resistant to fire damage', 'Immune to poison damage', "Can't be charmed", '+1 to all saving throws', '+2 CON', '+1 AC while worn',
      '3 charges · regains 1d3 at dawn', 'Requires attunement',
    ]));
  });
});

describe('warnings catch combinations that would confuse the sheet', () => {
  test('two-handed with versatile, light with heavy, ranged without range', () => {
    const texts = itemDraftWarnings(weapon({ weapon: { reach: 'ranged', properties: ['two-handed', 'versatile', 'light', 'heavy'] } })).map(w => w.field);
    expect(texts).toEqual(expect.arrayContaining(['properties', 'range']));
  });
  test('a sensible item has no warnings', () => {
    expect(itemDraftWarnings(weapon())).toEqual([]);
  });
});
