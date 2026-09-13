import {
  calculateHpDamage,
  getCurrentHp,
  rollD20,
} from './cleanSheetUtils';

describe('clean character sheet HP helpers', () => {
  test('preserves exactly 0 current HP instead of treating it as missing', () => {
    expect(getCurrentHp({ current_hit_points: 0, max_hit_points: 27 })).toBe(0);
    expect(getCurrentHp({ hp: 0, max_hp: 19 })).toBe(0);
  });

  test('falls back to maximum HP only when current HP is genuinely missing', () => {
    expect(getCurrentHp({ max_hit_points: 27 })).toBe(27);
    expect(getCurrentHp({ current_hit_points: null, max_hit_points: 18 })).toBe(18);
  });

  test('damage can reduce a character to zero after temporary HP is consumed', () => {
    expect(calculateHpDamage({ currentHp: 5, tempHp: 3, maxHp: 20, amount: 8 })).toMatchObject({
      current_hit_points: 0,
      temporary_hit_points: 0,
      tempAbsorbed: 3,
      hpDamage: 5,
    });
  });
});

describe('clean character sheet d20 roller', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('accepts the sheet options object and applies advantage plus manual bonus', () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2) // 5
      .mockReturnValueOnce(0.8); // 17

    expect(rollD20(4, { mode: 'advantage', bonus: 2 })).toMatchObject({
      d20: 17,
      modifier: 6,
      baseModifier: 4,
      bonus: 2,
      total: 23,
      mode: 'advantage',
      allRolls: [5, 17],
    });
  });

  test('accepts disadvantage from the sheet options object', () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.95) // 20
      .mockReturnValueOnce(0.05); // 2

    expect(rollD20(3, { mode: 'disadvantage' })).toMatchObject({
      d20: 2,
      modifier: 3,
      total: 5,
      mode: 'disadvantage',
      allRolls: [20, 2],
    });
  });

  test('keeps string roll-mode callers backwards compatible', () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // 3
      .mockReturnValueOnce(0.7); // 15

    expect(rollD20(1, 'advantage')).toMatchObject({
      d20: 15,
      modifier: 1,
      total: 16,
      mode: 'advantage',
    });
  });
});
