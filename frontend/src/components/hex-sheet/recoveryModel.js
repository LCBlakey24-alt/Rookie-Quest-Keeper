/**
 * Rests, Hit Dice and death saves for the hexagon sheet, kept free of React.
 * The rules match the classic sheet (CleanCharacterSheet): the same hit-die
 * fields, the same 2024 rule that a Hit Point Die needs at least 1 HP and
 * recovers at least 1, and the same death-save outcomes.
 */
import { clampDeathCount, getCurrentHp, getMaxHp, parseHitDie } from '@/components/clean-sheet/cleanSheetUtils';

const abilityMod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);

export function rulesEditionOf(character = {}) {
  return String(character?.rules_edition || character?.edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014';
}

/** Everything the recovery panel shows. */
export function recoveryState(character = {}) {
  const maxHp = getMaxHp(character);
  const currentHp = Math.min(getCurrentHp(character), maxHp);
  const hitDie = parseHitDie(character?.hit_dice || `${character?.level || 1}d8`);
  const remaining = Number(character?.hit_dice_remaining ?? character?.level ?? hitDie.total) || 0;
  const successes = clampDeathCount(character?.death_saves_successes);
  const failures = clampDeathCount(character?.death_saves_failures);
  return {
    currentHp,
    maxHp,
    hitDieSides: hitDie.sides,
    hitDiceTotal: hitDie.total,
    hitDiceRemaining: Math.max(0, remaining),
    conMod: abilityMod(character?.constitution),
    edition: rulesEditionOf(character),
    successes,
    failures,
    // Shown while dying, or while any save is still marked.
    showDeathSaves: currentHp <= 0 || successes > 0 || failures > 0,
    stable: successes >= 3,
    dead: failures >= 3,
  };
}

/**
 * Whether a Hit Die can be spent now, and why not. Returns null when it can.
 */
export function hitDieBlocker(state) {
  if (state.edition === '2024' && state.currentHp <= 0) return '2024 rules need at least 1 HP before spending a Hit Point Die.';
  if (state.hitDiceRemaining <= 0) return 'No Hit Dice left. A long rest restores them.';
  if (state.currentHp >= state.maxHp) return 'Already at full HP.';
  return null;
}

/** The save for spending one Hit Die that rolled `die`. */
export function hitDieUpdates(state, die) {
  const minimum = state.edition === '2024' ? 1 : 0;
  const healed = Math.max(minimum, Number(die) + state.conMod);
  const nextHp = Math.min(state.maxHp, state.currentHp + healed);
  const updates = { current_hit_points: nextHp, hit_dice_remaining: Math.max(0, state.hitDiceRemaining - 1) };
  // Back above 0 HP: the death saves start fresh, as healing on the HP dial does.
  if (nextHp > 0 && (state.successes > 0 || state.failures > 0)) {
    updates.death_saves_successes = 0;
    updates.death_saves_failures = 0;
  }
  return { healed: nextHp - state.currentHp, total: healed, updates };
}

/** The save and message for a death save that rolled a natural `d20`. */
export function deathSaveUpdates(state, d20) {
  const roll = Number(d20);
  if (roll === 20) {
    return {
      updates: { current_hit_points: 1, death_saves_successes: 0, death_saves_failures: 0 },
      message: 'Natural 20! You regain 1 HP.',
    };
  }
  if (roll === 1) {
    const failures = Math.min(3, state.failures + 2);
    return { updates: { death_saves_failures: failures }, message: failures >= 3 ? 'Natural 1: three failures. Your character has died.' : 'Natural 1: two failures marked.' };
  }
  if (roll >= 10) {
    const successes = Math.min(3, state.successes + 1);
    return { updates: { death_saves_successes: successes }, message: successes >= 3 ? 'Three successes: you are stable.' : 'Death save success marked.' };
  }
  const failures = Math.min(3, state.failures + 1);
  return { updates: { death_saves_failures: failures }, message: failures >= 3 ? 'Three failures. Your character has died.' : 'Death save failure marked.' };
}

/**
 * How the dice tray shows a death save: a pass (10 or more) in green, a fail
 * in red, with a short caption in place of the "d20 + 0" sum.
 */
export function deathSaveResultStyle(d20) {
  const roll = Number(d20);
  if (roll === 20) return { tone: 'success', caption: 'Natural 20: back up with 1 HP' };
  if (roll === 1) return { tone: 'failure', caption: 'Natural 1: two fails' };
  return roll >= 10 ? { tone: 'success', caption: 'Pass' } : { tone: 'failure', caption: 'Fail' };
}

/** Tapping the nth pip (1-3) sets the count to n, or clears it back to n-1. */
export function deathSavePipUpdates(state, type, index) {
  const field = type === 'success' ? 'death_saves_successes' : 'death_saves_failures';
  const current = type === 'success' ? state.successes : state.failures;
  const next = current === index ? index - 1 : index;
  return { [field]: clampDeathCount(next) };
}
