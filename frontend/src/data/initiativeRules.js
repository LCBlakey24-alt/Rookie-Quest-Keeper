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


export function dexterityModifier(score = 10) {
  const numeric = Number(score);
  const safeScore = Number.isFinite(numeric) ? numeric : 10;
  return Math.floor((safeScore - 10) / 2);
}

export function getInitiativeModifier(source = {}) {
  const explicit = source?.initiativeMod ?? source?.initiative_bonus ?? source?.initiative_mod;
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    return normaliseInitiativeModifier(explicit);
  }

  const dexterity = source?.dexterity
    ?? source?.dex
    ?? source?.stats?.dexterity
    ?? source?.stats?.dex
    ?? 10;
  return dexterityModifier(dexterity);
}
