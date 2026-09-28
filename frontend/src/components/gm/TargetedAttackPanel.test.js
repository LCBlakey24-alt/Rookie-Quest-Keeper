import { resolveTargetedAttack, rollTargetedDamage } from './TargetedAttackPanel';

function rngFrom(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('TargetedAttackPanel roll resolution', () => {
  test('natural 1 always misses even when the attack total reaches the target AC', () => {
    const result = resolveTargetedAttack(
      {
        attackBonus: 12,
        targetAc: 10,
        dice: { count: 1, sides: 8, modifier: 4, expression: '1d8+4' },
      },
      rngFrom([0])
    );

    expect(result.roll).toBe(1);
    expect(result.total).toBe(13);
    expect(result.fumble).toBe(true);
    expect(result.hit).toBe(false);
    expect(result.damage.total).toBe(0);
    expect(result.damage.rolls).toEqual([]);
  });

  test('natural 20 always hits and doubles damage dice without doubling the modifier', () => {
    const result = resolveTargetedAttack(
      {
        attackBonus: -5,
        targetAc: 30,
        dice: { count: 1, sides: 8, modifier: 3, expression: '1d8+3' },
      },
      rngFrom([0.999, 0, 0.999])
    );

    expect(result.roll).toBe(20);
    expect(result.total).toBe(15);
    expect(result.critical).toBe(true);
    expect(result.hit).toBe(true);
    expect(result.damage).toEqual({
      rolls: [1, 8],
      total: 12,
      expression: '2d8+3',
    });
  });

  test('ordinary attack totals are compared against AC', () => {
    const hit = resolveTargetedAttack(
      { attackBonus: 5, targetAc: 15, dice: { count: 1, sides: 6, modifier: 2, expression: '1d6+2' } },
      rngFrom([0.49, 0.49])
    );
    const miss = resolveTargetedAttack(
      { attackBonus: 4, targetAc: 15, dice: { count: 1, sides: 6, modifier: 2, expression: '1d6+2' } },
      rngFrom([0.49])
    );

    expect(hit.roll).toBe(10);
    expect(hit.total).toBe(15);
    expect(hit.hit).toBe(true);
    expect(hit.damage.total).toBe(5);

    expect(miss.roll).toBe(10);
    expect(miss.total).toBe(14);
    expect(miss.hit).toBe(false);
    expect(miss.damage.total).toBe(0);
  });

  test('negative damage modifiers cannot produce negative applied damage', () => {
    expect(rollTargetedDamage(
      { count: 1, sides: 4, modifier: -5, expression: '1d4-5' },
      false,
      rngFrom([0])
    )).toMatchObject({
      rolls: [1],
      total: 0,
      expression: '1d4-5',
    });
  });
});
