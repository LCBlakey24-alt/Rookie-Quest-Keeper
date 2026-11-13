/*
 * How a turned wheel comes to rest, shared by every wheel that spins (the
 * sheet's combat wheel, the skills dial, and the choice wheels for dice and
 * spell levels).
 *
 * The wheel follows the finger freely. On release it keeps the speed it was
 * flicked with, glides, slows, and locks onto the wedge it comes to rest on.
 * A deliberate turn always moves it on: a short nudge forward goes to the
 * next wedge instead of springing back to where it started.
 */

/** How far a flick carries on after release, in ms of travel at release speed. */
export const GLIDE_MS = 260;
/** A flick never carries the wheel more than this far on its own. */
export const MAX_GLIDE_DEGREES = 720;
/** Samples older than this don't count towards release speed. */
const SAMPLE_WINDOW_MS = 90;

/** Start tracking speed for a drag. */
export function startSpinSamples(time, rotation) {
  return [{ time, rotation }];
}

/** Record where the wheel is now, keeping only the recent samples. */
export function addSpinSample(samples, time, rotation) {
  const recent = samples.filter((sample) => time - sample.time <= SAMPLE_WINDOW_MS);
  recent.push({ time, rotation });
  return recent;
}

/** Turning speed at release, in degrees per ms (signed). */
export function releaseVelocity(samples, time) {
  const recent = samples.filter((sample) => time - sample.time <= SAMPLE_WINDOW_MS);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const span = last.time - first.time;
  return span > 0 ? (last.rotation - first.rotation) / span : 0;
}

/**
 * Where a released wheel locks.
 * @param {number} rotation  where the finger left it (degrees)
 * @param {number} start     where it rested before the drag
 * @param {number} velocity  release speed, degrees per ms
 * @param {number} step      degrees per wedge
 */
export function spinTarget(rotation, start, velocity, step) {
  const glide = Math.max(-MAX_GLIDE_DEGREES, Math.min(MAX_GLIDE_DEGREES, velocity * GLIDE_MS));
  const projected = rotation + glide;
  const home = Math.round(start / step) * step;
  let target = Math.round(projected / step) * step;
  // A deliberate turn that would only spring back moves on one wedge instead.
  const moved = projected - home;
  if (target === home && Math.abs(moved) >= Math.min(step * 0.25, 10)) target = home + Math.sign(moved) * step;
  return target + 0; // never -0
}

/** How long the glide to the locked wedge takes, longer for a bigger spin. */
export function glideDuration(from, to) {
  return Math.round(Math.max(240, Math.min(1400, 220 + Math.abs(to - from) * 2.4)));
}

/** The easing for a glide: quick at first, slowing smoothly into the lock. */
export const GLIDE_EASING = 'cubic-bezier(0.12, 0.7, 0.22, 1)';
