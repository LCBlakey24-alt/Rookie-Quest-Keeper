import { rollDie } from './diceRoller';

export function resolveDeathSaveRoll(rng = Math.random) {
  const natural = rollDie(20, rng);

  if (natural === 20) {
    return {
      natural,
      revive: true,
      successesDelta: 0,
      failuresDelta: 0,
    };
  }

  if (natural === 1) {
    return {
      natural,
      revive: false,
      successesDelta: 0,
      failuresDelta: 2,
    };
  }

  if (natural >= 10) {
    return {
      natural,
      revive: false,
      successesDelta: 1,
      failuresDelta: 0,
    };
  }

  return {
    natural,
    revive: false,
    successesDelta: 0,
    failuresDelta: 1,
  };
}

export function applyDeathSaveResult(deathSaves = {}, result = {}) {
  if (result.revive) {
    return {
      hp: 1,
      deathSaves: { successes: 0, failures: 0 },
    };
  }

  const successes = Math.min(3, Math.max(0, Number(deathSaves.successes || 0)) + Number(result.successesDelta || 0));
  const failures = Math.min(3, Math.max(0, Number(deathSaves.failures || 0)) + Number(result.failuresDelta || 0));

  return {
    hp: null,
    deathSaves: { successes, failures },
  };
}
