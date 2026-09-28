import {
  dexterityModifier,
  getInitiativeModifier,
  normaliseInitiativeModifier,
  parseInitiativeTotal,
  rollInitiative,
} from './initiativeRules';

describe('initiative rules helpers', () => {
  test('manual initiative preserves zero and negative totals', () => {
    expect(parseInitiativeTotal('0')).toBe(0);
    expect(parseInitiativeTotal('-2')).toBe(-2);
    expect(parseInitiativeTotal('17')).toBe(17);
  });

  test('blank or non-integer manual initiative is treated as missing', () => {
    expect(parseInitiativeTotal('')).toBeNull();
    expect(parseInitiativeTotal(null)).toBeNull();
    expect(parseInitiativeTotal('12.5')).toBeNull();
    expect(parseInitiativeTotal('not-a-number')).toBeNull();
  });

  test('initiative roll applies the modifier to the natural d20', () => {
    expect(rollInitiative(3, () => 0.49)).toEqual({
      natural: 10,
      modifier: 3,
      total: 13,
    });
  });

  test('initiative supports negative modifiers', () => {
    expect(rollInitiative(-2, () => 0)).toEqual({
      natural: 1,
      modifier: -2,
      total: -1,
    });
  });

  test('modifier normalization rejects invalid values without inventing a bonus', () => {
    expect(normaliseInitiativeModifier('4')).toBe(4);
    expect(normaliseInitiativeModifier('bad')).toBe(0);
  });

  test('derives initiative modifier from dexterity when no explicit bonus exists', () => {
    expect(dexterityModifier(18)).toBe(4);
    expect(dexterityModifier(9)).toBe(-1);
    expect(dexterityModifier(0)).toBe(-5);
    expect(getInitiativeModifier({ dexterity: 16 })).toBe(3);
    expect(getInitiativeModifier({ stats: { dex: 8 } })).toBe(-1);
  });

  test('explicit initiative modifiers take precedence over dexterity', () => {
    expect(getInitiativeModifier({ initiative_bonus: -2, dexterity: 18 })).toBe(-2);
    expect(getInitiativeModifier({ initiativeMod: 5, dexterity: 8 })).toBe(5);
  });
});
