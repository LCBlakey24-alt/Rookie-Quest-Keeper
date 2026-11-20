/**
 * What taking damage does to a creature, in one place for the character
 * sheets and the combat tracker (review finding 12). Plain rules, no React.
 *
 * The rules (the same in the 2014 and 2024 Player's Handbooks):
 *   - Temporary hit points soak damage first.
 *   - Taking damage while concentrating calls for a Constitution save,
 *     DC 10 or half the damage, whichever is higher.
 *   - Dropping to 0 hit points means falling unconscious, which ends
 *     concentration, and starts death saves afresh.
 *   - Damage left over after dropping to 0 that equals or exceeds the
 *     hit point maximum kills outright (instant death).
 *   - Damage taken while already at 0 is a failed death save; a critical
 *     hit is two. A stable creature that takes damage is no longer stable.
 *     If that damage equals or exceeds the hit point maximum, it dies.
 *
 * The result only describes the change. The sheet or tracker applies it,
 * and the GM stays free to adjust it (death saves can still be edited by
 * hand). Instant death is reported as `instantDeath` so callers say so
 * plainly instead of quietly marking three failures.
 */

const DEATH_LIMIT = 3;

const count = (value) => Math.max(0, Math.min(DEATH_LIMIT, Math.floor(Number(value) || 0)));
const whole = (value) => Math.max(0, Math.floor(Number(value) || 0));

/** The Constitution save DC for keeping concentration after `damage`. */
export function concentrationSaveDc(damage) {
  return Math.max(10, Math.floor(whole(damage) / 2));
}

export function applyDamage({
  currentHp = 0,
  tempHp = 0,
  maxHp = 1,
  amount = 0,
  successes = 0,
  failures = 0,
  critical = false,
  concentrating = false,
} = {}) {
  const safeMax = Math.max(1, whole(maxHp));
  const hp = Math.min(safeMax, whole(currentHp));
  const temp = whole(tempHp);
  const damage = whole(amount);
  const tempAbsorbed = Math.min(temp, damage);
  const rest = damage - tempAbsorbed;

  const base = {
    currentHp: hp,
    tempHp: temp - tempAbsorbed,
    successes: count(successes),
    failures: count(failures),
    tempAbsorbed,
    hpDamage: 0,
    droppedToZero: false,
    failuresAdded: 0,
    instantDeath: false,
    endsConcentration: false,
    concentrationCheckDc: null,
  };
  if (!damage) return base;

  // Every bit of damage, even damage the temporary hit points soaked, calls
  // for a concentration save while the caster stays conscious.
  const checkIfStillUp = (result) => (concentrating && result.currentHp > 0
    ? { ...result, concentrationCheckDc: concentrationSaveDc(damage) }
    : result);

  if (!rest) return checkIfStillUp(base);

  if (hp > 0) {
    const nextHp = Math.max(0, hp - rest);
    const result = { ...base, currentHp: nextHp, hpDamage: hp - nextHp };
    if (nextHp > 0) return checkIfStillUp(result);
    const overflow = rest - hp;
    const instantDeath = overflow >= safeMax;
    return {
      ...result,
      droppedToZero: true,
      successes: 0,
      failures: instantDeath ? DEATH_LIMIT : 0,
      instantDeath,
      endsConcentration: Boolean(concentrating),
    };
  }

  // Already at 0 hit points.
  const instantDeath = rest >= safeMax;
  const failuresAdded = critical ? 2 : 1;
  const wasStable = count(successes) >= DEATH_LIMIT;
  return {
    ...base,
    successes: wasStable ? 0 : count(successes),
    failures: instantDeath ? DEATH_LIMIT : Math.min(DEATH_LIMIT, count(failures) + failuresAdded),
    failuresAdded: instantDeath ? DEATH_LIMIT - count(failures) : Math.min(DEATH_LIMIT, count(failures) + failuresAdded) - count(failures),
    instantDeath,
    endsConcentration: Boolean(concentrating),
  };
}

/**
 * The character fields to save for a damage result: hit points, temporary
 * hit points, death saves when they changed, and concentration when it ends.
 */
export function damageUpdatesForCharacter(character = {}, result) {
  const updates = {
    current_hit_points: result.currentHp,
    temporary_hit_points: result.tempHp,
    temp_hp: result.tempHp,
  };
  if (result.successes !== count(character.death_saves_successes)) updates.death_saves_successes = result.successes;
  if (result.failures !== count(character.death_saves_failures)) updates.death_saves_failures = result.failures;
  if (result.endsConcentration) {
    updates.concentrating_on = null;
    updates.concentration = null;
  }
  return updates;
}

/** A short line for the table about what the damage did, or null. */
export function damageOutcomeMessage(name, result) {
  const who = name || 'The character';
  if (result.instantDeath) return `${who} takes damage equal to their hit point maximum: instant death.`;
  if (result.droppedToZero) return `${who} drops to 0 HP and falls unconscious${result.endsConcentration ? ', ending concentration' : ''}.`;
  if (result.failuresAdded > 0) return `${who} takes damage at 0 HP: ${result.failuresAdded === 2 ? 'two failed death saves (critical hit)' : 'a failed death save'} (${result.failures} of 3).`;
  return null;
}
