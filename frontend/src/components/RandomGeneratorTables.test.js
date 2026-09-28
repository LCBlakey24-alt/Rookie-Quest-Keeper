import { rollGeneratorDice } from './RandomGeneratorTables';

function rngFrom(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('RandomGeneratorTables dice', () => {
  test('treasure dice use canonical notation math', () => {
    const result = rollGeneratorDice('3d6+2', rngFrom([0, 0.49, 0.999]));

    expect(result.valid).toBe(true);
    expect(result.rolls.map(roll => roll.result)).toEqual([1, 3, 6]);
    expect(result.total).toBe(12);
  });

  test('spaced formulas remain valid', () => {
    const result = rollGeneratorDice('2d4 + 10', rngFrom([0, 0.999]));

    expect(result.valid).toBe(true);
    expect(result.total).toBe(15);
  });

  test('malformed generator formulas fail rather than partially rolling', () => {
    const result = rollGeneratorDice('2d6 treasure + 4', () => 0.5);

    expect(result.valid).toBe(false);
    expect(result.rolls).toEqual([]);
    expect(result.error).toBeTruthy();
  });
});
