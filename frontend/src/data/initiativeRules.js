import { rollDie } from './diceRoller';

export function normaliseInitiativeModifier(value = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

export function parseInitiativeTotal(value) {
  if (value === '' || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : null;
}

export function rollInitiative(modifier = 0, rng = Math.random) {
  const natural = rollDie(20, rng);
  const safeModifier = normaliseInitiativeModifier(modifier);
  return {
    natural,
    modifier: safeModifier,
    total: natural + safeModifier,
  };
}
