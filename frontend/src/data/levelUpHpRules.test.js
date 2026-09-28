import { getLevelUpHpChoice, getLevelUpHpReceipt } from './levelUpHpRules';

describe('level-up HP rules', () => {
  test('fixed average uses the class die average plus Constitution', () => {
    expect(getLevelUpHpChoice({
      hitDie: 10,
      constitutionModifier: 3,
      method: 'average',
    })).toMatchObject({
      valid: true,
      method: 'average',
      dieValue: 6,
      gain: 9,
      formula: '6 +3 CON = +9 HP',
      sourceLabel: 'Fixed / average',
    });
  });

  test('manual physical roll expects the raw die and adds Constitution automatically', () => {
    expect(getLevelUpHpChoice({
      hitDie: 10,
      constitutionModifier: 3,
      method: 'manual',
      rawRoll: 7,
    })).toMatchObject({
      valid: true,
      dieValue: 7,
      gain: 10,
      formula: '7 +3 CON = +10 HP',
      sourceLabel: 'Physical die',
    });
  });

  test('Keeper roll and physical roll share exactly the same HP math', () => {
    const keeper = getLevelUpHpChoice({
      hitDie: 8,
      constitutionModifier: -1,
      method: 'roll',
      rawRoll: 6,
    });
    const physical = getLevelUpHpChoice({
      hitDie: 8,
      constitutionModifier: -1,
      method: 'manual',
      rawRoll: 6,
    });

    expect(keeper.gain).toBe(5);
    expect(physical.gain).toBe(5);
    expect(keeper.formula).toBe('6 -1 CON = +5 HP');
    expect(physical.formula).toBe('6 -1 CON = +5 HP');
  });

  test('HP gained can never fall below one', () => {
    expect(getLevelUpHpChoice({
      hitDie: 6,
      constitutionModifier: -3,
      method: 'manual',
      rawRoll: 1,
    })).toMatchObject({
      valid: true,
      gain: 1,
      formula: '1 -3 CON = +1 HP (minimum +1 HP)',
    });
  });

  test('manual and Keeper rolls must be legal values for the hit die', () => {
    expect(getLevelUpHpChoice({ hitDie: 10, method: 'manual', rawRoll: 0 }).valid).toBe(false);
    expect(getLevelUpHpChoice({ hitDie: 10, method: 'manual', rawRoll: 11 }).valid).toBe(false);
    expect(getLevelUpHpChoice({ hitDie: 10, method: 'roll', rawRoll: null }).valid).toBe(false);
  });

  test('receipt shows max HP before and after without changing current HP', () => {
    const choice = getLevelUpHpChoice({
      hitDie: 10,
      constitutionModifier: 3,
      method: 'manual',
      rawRoll: 7,
    });

    expect(getLevelUpHpReceipt({ max_hit_points: 37, current_hit_points: 12 }, choice)).toEqual({
      currentMax: 37,
      nextMax: 47,
      gain: 10,
      formula: '7 +3 CON = +10 HP',
      sourceLabel: 'Physical die',
      valid: true,
    });
  });
});
