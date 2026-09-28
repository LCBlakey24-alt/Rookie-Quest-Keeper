import { rollCreatureDamage } from './CreatureAbilityCard';

function rngFrom(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('CreatureAbilityCard damage rolls', () => {
  test('normal damage rolls the authored dice and applies the flat modifier once', () => {
    const result = rollCreatureDamage(
      { count: 2, sides: 6, modifier: 3 },
      false,
      rngFrom([0, 0.999])
    );

    expect(result).toEqual({
      rolls: [1, 6],
      total: 10,
      dice: '2d6+3',
    });
  });

  test('critical damage doubles damage dice without doubling the modifier', () => {
    const result = rollCreatureDamage(
      { count: 2, sides: 6, modifier: 3 },
      true,
      rngFrom([0, 0.2, 0.4, 0.999])
    );

    expect(result.rolls).toEqual([1, 2, 3, 6]);
    expect(result.total).toBe(15);
    expect(result.dice).toBe('4d6+3');
  });

  test('critical damage applies a negative modifier only once', () => {
    const result = rollCreatureDamage(
      { count: 1, sides: 8, modifier: -2 },
      true,
      rngFrom([0.5, 0.999])
    );

    expect(result.rolls).toEqual([5, 8]);
    expect(result.total).toBe(11);
    expect(result.dice).toBe('2d8-2');
  });
});
