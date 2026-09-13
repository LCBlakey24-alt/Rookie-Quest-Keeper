import {
  calculateHpDamage,
  calculateHpHealing,
  getCurrentHp,
  getTempHp,
  rollD20,
} from './cleanSheetUtils';

describe('player-session HP flow', () => {
  test('temporary HP absorbs damage before real HP and zero remains zero', () => {
    const damaged = calculateHpDamage({ currentHp: 6, tempHp: 4, maxHp: 20, amount: 10 });

    expect(damaged).toMatchObject({
      current_hit_points: 0,
      temporary_hit_points: 0,
      hpDamage: 6,
      tempAbsorbed: 4,
    });
    expect(getCurrentHp({ current_hit_points: damaged.current_hit_points, max_hit_points: 20 })).toBe(0);
    expect(getTempHp({ temporary_hit_points: damaged.temporary_hit_points })).toBe(0);
  });

  test('healing from zero restores only the requested amount', () => {
    expect(calculateHpHealing({ currentHp: 0, maxHp: 20, amount: 5 })).toEqual({
      current_hit_points: 5,
      healed: 5,
    });
  });
});

describe('player-session roll flow', () => {
  afterEach(() => jest.restoreAllMocks());

  test('sheet-style advantage roll applies both ability modifier and manual roll bonus', () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.15) // 4
      .mockReturnValueOnce(0.85); // 18

    const roll = rollD20(5, { mode: 'advantage', bonus: 2, label: 'Stealth' });

    expect(roll).toMatchObject({
      d20: 18,
      baseModifier: 5,
      bonus: 2,
      modifier: 7,
      total: 25,
      mode: 'advantage',
    });
  });
});
