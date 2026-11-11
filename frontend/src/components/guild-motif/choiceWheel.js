/*
 * Geometry and naming for the choice wheel: options sit on a ring inside
 * the hexagon, and the one resting at the top is the selection.
 */
const wrap = (value, count) => ((value % count) + count) % count;

/** The option resting at the top for a total rotation in degrees. */
export function optionAtTop(rotation, count) {
  if (count <= 0) return 0;
  return wrap(Math.round(-rotation / (360 / count)), count);
}

/** The rotation that brings `index` to the top, turning the short way from `from`. */
export function rotationForOption(index, from, count) {
  const base = -index * (360 / count);
  const turns = Math.round((from - base) / 360);
  return base + turns * 360 + 0; // never -0
}

/** Where a released wheel settles: the nearest whole option. */
export function settleRotation(rotation, count) {
  const step = 360 / count;
  return Math.round(rotation / step) * step + 0; // never -0
}

/** Angle of a point about a centre, in degrees. */
export function pointerAngle(x, y, centreX, centreY) {
  return (Math.atan2(y - centreY, x - centreX) * 180) / Math.PI;
}

/** The smallest signed turn between two angles, so crossing ±180° is not a jump. */
export function angleStep(previous, next) {
  let step = next - previous;
  while (step > 180) step -= 360;
  while (step < -180) step += 360;
  return step;
}

const letters = (label) => String(label || '').replace(/[^A-Za-z]/g, '').toUpperCase();

/**
 * Three-letter ring labels, unique within the set. "Half-Elf" and
 * "Half-Orc" become HEL and HOR rather than both HAL, and Bard becomes BRD
 * beside Barbarian's BAR. Anything still clashing takes later letters.
 */
export function shortLabels(labels) {
  const used = new Set();
  return labels.map((label) => {
    const parts = String(label || '').split(/[\s-]+/).filter(Boolean);
    const whole = letters(label);
    const candidates = [];
    if (parts.length > 1) candidates.push((letters(parts[0]).slice(0, 1) + letters(parts[1]).slice(0, 2)));
    candidates.push(whole.slice(0, 3));
    // First letter plus the next two consonants: Bard -> BRD beside Barbarian's BAR.
    candidates.push(whole.slice(0, 1) + whole.slice(1).replace(/[AEIOU]/g, '').slice(0, 2));
    for (let i = 3; i < whole.length; i += 1) candidates.push(whole.slice(0, 2) + whole[i]);
    const pick = candidates.find((candidate) => candidate && !used.has(candidate)) || whole.slice(0, 3) || '?';
    used.add(pick);
    return pick;
  });
}
