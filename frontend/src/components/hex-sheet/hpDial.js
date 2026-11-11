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

/*
 * Flicking. A thumb holding the phone can only sweep a short arc on one
 * side of the dial, so a quick swipe keeps the dial spinning after the
 * finger lifts, slowing down like a real wheel. Speeds are in degrees per
 * millisecond of dial rotation.
 */
export const FLICK_MIN_SPEED = 0.25; // slower than this on release: no coast
export const FLICK_MAX_SPEED = 1.6; // cap so one flick moves a sensible amount
export const FLICK_FRICTION = 0.92; // speed kept per 16 ms frame
export const FLICK_STOP_SPEED = 0.02;
const FLICK_WINDOW_MS = 100; // only the last part of the swipe counts
const FLICK_HOLD_MS = 60; // a finger that stopped before lifting is not a flick

/**
 * The dial's speed at release, from recent samples of { t, total } (time in
 * ms, total turn in degrees). Zero when the finger had stopped, or moved
 * too slowly to count as a flick.
 */
export function flickVelocity(samples, releasedAt) {
  if (!samples || samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  if (releasedAt - last.t > FLICK_HOLD_MS) return 0;
  const recent = samples.filter((sample) => last.t - sample.t <= FLICK_WINDOW_MS);
  const first = recent[0];
  const span = last.t - first.t;
  if (span < 8) return 0;
  const speed = (last.total - first.total) / span;
  if (Math.abs(speed) < FLICK_MIN_SPEED) return 0;
  return Math.max(-FLICK_MAX_SPEED, Math.min(FLICK_MAX_SPEED, speed));
}

/** One frame of coasting: how far the dial moves and its new speed. */
export function coastStep(velocity, elapsedMs) {
  return {
    distance: velocity * elapsedMs,
    velocity: velocity * FLICK_FRICTION ** (elapsedMs / 16),
  };
}

/** Where a coast lands: the whole hit point it slowed down in. */
export function settledRotation(totalDegrees, degreesPerHp = DEGREES_PER_HP) {
  return rotationForDelta(deltaForRotation(totalDegrees, degreesPerHp), degreesPerHp);
}
