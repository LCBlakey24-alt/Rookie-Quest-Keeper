import { applyDeathSaveResult, resolveDeathSaveRoll } from './combatRollRules';

describe('combat roll rules', () => {
  test('natural 20 revives at 1 HP and clears death saves', () => {
    const result = resolveDeathSaveRoll(() => 0.999999);
    expect(result).toEqual({
      natural: 20,
      revive: true,
      successesDelta: 0,
      failuresDelta: 0,
    });
    expect(applyDeathSaveResult({ successes: 2, failures: 2 }, result)).toEqual({
      hp: 1,
      deathSaves: { successes: 0, failures: 0 },
    });
  });

  test('natural 1 adds two failures', () => {
    const result = resolveDeathSaveRoll(() => 0);
    expect(result.natural).toBe(1);
    expect(result.failuresDelta).toBe(2);
    expect(applyDeathSaveResult({ successes: 1, failures: 1 }, result)).toEqual({
      hp: null,
      deathSaves: { successes: 1, failures: 3 },
    });
  });

  test('10 or higher records one success', () => {
    const result = resolveDeathSaveRoll(() => 0.49);
    expect(result.natural).toBe(10);
    expect(applyDeathSaveResult({ successes: 1, failures: 0 }, result)).toEqual({
      hp: null,
      deathSaves: { successes: 2, failures: 0 },
    });
  });

  test('2 through 9 records one failure', () => {
    const result = resolveDeathSaveRoll(() => 0.4);
    expect(result.natural).toBe(9);
    expect(applyDeathSaveResult({ successes: 0, failures: 1 }, result)).toEqual({
      hp: null,
      deathSaves: { successes: 0, failures: 2 },
    });
  });

  test('successes and failures never exceed three', () => {
    expect(applyDeathSaveResult(
      { successes: 3, failures: 3 },
      { successesDelta: 1, failuresDelta: 2, revive: false },
    )).toEqual({
      hp: null,
      deathSaves: { successes: 3, failures: 3 },
    });
  });
});
