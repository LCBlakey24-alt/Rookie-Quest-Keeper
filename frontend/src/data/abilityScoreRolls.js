import { rollDiceNotation } from './diceRoller';

export function rollAbilityScore(rng = Math.random) {
  const result = rollDiceNotation('4d6kh3', { rng });
  if (!result.valid || result.rolls.length !== 4) {
    throw new Error(result.error || 'Could not roll an ability score.');
  }

  const rolls = result.rolls.map(roll => roll.result);
  const kept = result.visibleRolls.map(roll => roll.result);
  const dropped = result.rolls
    .filter(roll => roll.dropped)
    .map(roll => roll.result);

  return {
    rolls,
    kept,
    dropped,
    total: result.total,
  };
}

export function rollAbilityScoreSet(count = 6, rng = Math.random) {
  const safeCount = Math.max(1, Math.min(20, Math.floor(Number(count) || 6)));
  return Array.from({ length: safeCount }, () => rollAbilityScore(rng));
}
