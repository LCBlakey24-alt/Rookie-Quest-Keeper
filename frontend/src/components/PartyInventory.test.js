import { rollTreasureDice } from './PartyInventory';

function rngFrom(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('PartyInventory treasure dice', () => {
  test('uses canonical dice math for treasure rolls', () => {
    expect(rollTreasureDice(3, 6, rngFrom([0, 0.49, 0.999]))).toBe(10);
  });

  test('zero-count treasure entries stay zero without consuming randomness', () => {
    let calls = 0;
    const total = rollTreasureDice(0, 0, () => {
      calls += 1;
      return 0.5;
    });

    expect(total).toBe(0);
    expect(calls).toBe(0);
  });

  test('invalid die sizes cannot manufacture treasure', () => {
    expect(rollTreasureDice(2, 1, () => 0.9)).toBe(0);
    expect(rollTreasureDice(2, 0, () => 0.9)).toBe(0);
  });

  test('large treasure dice remain bounded by the requested expression', () => {
    expect(rollTreasureDice(12, 6, () => 0)).toBe(12);
    expect(rollTreasureDice(12, 6, () => 0.999)).toBe(72);
  });
});
