import {
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
});
