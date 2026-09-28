import {
  parseDiceFromText,
  resolveAttackRoll,
  rollAttackDamage,
} from './AttackRoller';

function rngFrom(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('AttackRoller rules helpers', () => {
  test('parses spaced damage modifiers and omitted dice counts from stat-block text', () => {
    expect(parseDiceFromText('Hit: 2d6 + 4 slashing plus d8 - 1 fire')).toEqual([
      { original: '2d6+4', count: 2, sides: 6, modifier: 4 },
      { original: 'd8-1', count: 1, sides: 8, modifier: -1 },
    ]);
  });

  test('ignores impossible dice while keeping valid groups', () => {
    expect(parseDiceFromText('bad 1d1, good 1d6+2, too-big 1d101')).toEqual([
      { original: '1d6+2', count: 1, sides: 6, modifier: 2 },
    ]);
  });

  test('natural 1 always misses even when the modified total beats AC', () => {
    const result = resolveAttackRoll({ attackBonus: 20, targetAC: 10 }, () => 0);

    expect(result).toMatchObject({
      roll: 1,
      bonus: 20,
      total: 21,
      hits: false,
      isCrit: false,
      isFumble: true,
    });
  });

  test('natural 20 always hits even when the modified total is below AC', () => {
    const result = resolveAttackRoll({ attackBonus: -10, targetAC: 40 }, () => 0.999999);

    expect(result).toMatchObject({
      roll: 20,
      bonus: -10,
      total: 10,
      hits: true,
      isCrit: true,
      isFumble: false,
    });
  });

  test('ordinary attack totals hit when they meet AC exactly', () => {
    const result = resolveAttackRoll({ attackBonus: 5, targetAC: 15 }, () => 0.49);

    expect(result.roll).toBe(10);
    expect(result.total).toBe(15);
    expect(result.hits).toBe(true);
  });

  test('critical damage doubles dice but applies the flat modifier only once', () => {
    const result = rollAttackDamage(
      [{ count: 2, sides: 6, modifier: 3 }],
      true,
      rngFrom([0, 0.2, 0.5, 0.999]),
    );

    expect(result).toEqual({
      total: 16,
      details: [{
        dice: '4d6+3',
        rolls: [1, 2, 4, 6],
        total: 16,
        isCrit: true,
      }],
    });
  });

  test('damage never becomes negative after a flat penalty', () => {
    const result = rollAttackDamage(
      [{ count: 1, sides: 4, modifier: -10 }],
      false,
      () => 0,
    );

    expect(result.total).toBe(0);
    expect(result.details[0]).toMatchObject({
      dice: '1d4-10',
      rolls: [1],
      total: 0,
    });
  });

  test('multiple damage components are rolled independently and summed', () => {
    const result = rollAttackDamage(
      [
        { count: 1, sides: 8, modifier: 3 },
        { count: 1, sides: 6, modifier: 0 },
      ],
      false,
      rngFrom([0.5, 0.999]),
    );

    expect(result.details.map(detail => detail.dice)).toEqual(['1d8+3', '1d6']);
    expect(result.details.map(detail => detail.total)).toEqual([8, 6]);
    expect(result.total).toBe(14);
  });
});
