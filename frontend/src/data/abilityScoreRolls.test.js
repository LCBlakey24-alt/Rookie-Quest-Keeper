import { rollAbilityScore, rollAbilityScoreSet } from './abilityScoreRolls';

function rngFrom(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('ability score rolls', () => {
  test('4d6 drop lowest keeps the highest three dice and reports the dropped die', () => {
    const result = rollAbilityScore(rngFrom([0, 0.2, 0.5, 0.999]));

    expect(result).toEqual({
      rolls: [1, 2, 4, 6],
      kept: [2, 4, 6],
      dropped: [1],
      total: 12,
    });
  });

  test('ties still drop exactly one die', () => {
    const result = rollAbilityScore(rngFrom([0.49, 0.49, 0.49, 0.49]));

    expect(result.rolls).toEqual([10 > 6 ? 6 : 3, 3, 3, 3]);
  });

  test('rolling a full set produces six independently derived totals', () => {
    const rng = rngFrom([
      0, 0, 0, 0,
      0.999, 0.999, 0.999, 0.999,
      0, 0.2, 0.5, 0.999,
      0.16, 0.33, 0.5, 0.66,
      0.83, 0.83, 0.83, 0,
      0.33, 0.33, 0.33, 0.33,
    ]);
    const results = rollAbilityScoreSet(6, rng);

    expect(results).toHaveLength(6);
    expect(results.map(result => result.total)).toEqual([3, 18, 12, 11, 15, 9]);
    expect(results.every(result => result.rolls.length === 4)).toBe(true);
    expect(results.every(result => result.kept.length === 3)).toBe(true);
  });

  test('set size is bounded to a safe range', () => {
    expect(rollAbilityScoreSet(0, () => 0)).toHaveLength(6);
    expect(rollAbilityScoreSet(999, () => 0)).toHaveLength(20);
  });
});
