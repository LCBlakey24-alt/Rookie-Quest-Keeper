/**
 * The rotary HP dial's arithmetic, kept free of React so every rule can be
 * tested on its own.
 *
 * Direction: clockwise adds, anticlockwise subtracts. On screen (y down)
 * an angle measured with atan2 grows clockwise, so a positive change in
 * angle is a positive change in HP.
 *
 * Sensitivity: one hit point per DEGREES_PER_HP of turn. 12 degrees was
 * found far too twitchy at the table; 36 (ten HP per full turn) is the
 * current preference and the one place to tune it.
 */
import { calculateHpDamage, calculateHpHealing, clampDeathCount, getCurrentHp, getMaxHp, getTempHp } from '@/components/clean-sheet/cleanSheetUtils';

export const DEGREES_PER_HP = 36;
export const DRAG_THRESHOLD_DEGREES = 6;

/** Angle of a point about the centre, in degrees, clockwise from +x. */
export function pointerAngle(x, y, centreX, centreY) {
  return (Math.atan2(y - centreY, x - centreX) * 180) / Math.PI;
}

/**
 * The smallest signed turn from one angle to the next, so crossing the
 * ±180° seam is a small step rather than a jump of a whole revolution.
 * Summing these gives an unbounded total: two full clockwise turns is 720.
 */
export function angleStep(previous, next) {
  let step = next - previous;
  while (step > 180) step -= 360;
  while (step < -180) step += 360;
  return step;
}

/** Whole hit points for a total turn. Rounds toward zero in both directions. */
export function deltaForRotation(totalDegrees, degreesPerHp = DEGREES_PER_HP) {
  const steps = totalDegrees / degreesPerHp;
  // Angles come from atan2, so a turn of exactly five steps can arrive as
  // 4.9999999. Within a hair of a whole step counts as that step.
  const nearest = Math.round(steps);
  const whole = Math.abs(steps - nearest) < 1e-6 ? nearest : (steps < 0 ? Math.ceil(steps) : Math.floor(steps));
  return whole + 0; // never -0
}

export function rotationForDelta(delta, degreesPerHp = DEGREES_PER_HP) {
  return delta * degreesPerHp;
}

/**
 * What confirming `delta` on `target` ('hp' or 'temp') would do, using the
 * classic sheet's own HP rules:
 *
 *   - damage comes off temporary HP first, then hit points, never below 0;
 *   - healing never goes past maximum hit points;
 *   - healing above 0 clears death saves;
 *   - temporary HP is its own pool: adjusting it never touches hit points.
 *
 * Returns the PATCH to send, the values it leads to, and the damage taken
 * (for the concentration check), or null when nothing would change.
 */
export function hpAdjustment(character, target, delta) {
  const amount = Math.abs(Number(delta) || 0);
  if (!character || !amount) return null;
  const maxHp = getMaxHp(character);
  const currentHp = Math.min(getCurrentHp(character), maxHp);
  const tempHp = getTempHp(character);

  if (target === 'temp') {
    const nextTemp = Math.max(0, tempHp + Number(delta));
    if (nextTemp === tempHp) return null;
    return {
      updates: { temporary_hit_points: nextTemp, temp_hp: nextTemp },
      result: { currentHp, maxHp, tempHp: nextTemp },
      damage: 0,
    };
  }

  if (delta < 0) {
    const outcome = calculateHpDamage({ currentHp, tempHp, maxHp, amount });
    if (!outcome.totalApplied && outcome.current_hit_points === currentHp) return null;
    return {
      updates: {
        current_hit_points: outcome.current_hit_points,
        temporary_hit_points: outcome.temporary_hit_points,
        temp_hp: outcome.temp_hp,
      },
      result: { currentHp: outcome.current_hit_points, maxHp, tempHp: outcome.temporary_hit_points },
      damage: amount,
    };
  }

  const outcome = calculateHpHealing({ currentHp, maxHp, amount });
  if (outcome.current_hit_points === currentHp) return null;
  const updates = { current_hit_points: outcome.current_hit_points };
  if (outcome.current_hit_points > 0
    && (clampDeathCount(character.death_saves_successes) || clampDeathCount(character.death_saves_failures))) {
    updates.death_saves_successes = 0;
    updates.death_saves_failures = 0;
  }
  return { updates, result: { currentHp: outcome.current_hit_points, maxHp, tempHp }, damage: 0 };
}
