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

/*
 * Ring labels that fit their wedge. A wheel with more options has narrower
 * wedges, so each name is sized to the room its wedge has at the label's
 * radius. A name with a space or hyphen may take two lines when that lets
 * it be larger ("Custom / Lineage", "Half- / Elf"). Widths are estimated
 * from an average glyph width; when even the smallest size would not fit,
 * the label is squeezed to the room (`squeeze`), never cut short.
 */
const GLYPH = 0.7;           // average glyph width per font-size unit, bold sans (cautious)
const FILL = 0.84;           // share of a wedge's arc a label may use
export const RING_LABEL_MAX = 8.5;
export const RING_LABEL_MIN = 4.8;

const roomAt = (radius, stepDegrees) => 2 * Math.PI * radius * (stepDegrees / 360) * FILL;
const textWidth = (text, size) => String(text).length * GLYPH * size;

/** Ways to write a label on one or two lines. */
function arrangements(label) {
  const text = String(label || '').trim();
  const out = [[text]];
  const breaks = [];
  for (let i = 1; i < text.length - 1; i += 1) {
    if (text[i] === ' ') breaks.push([text.slice(0, i), text.slice(i + 1)]);
    if (text[i] === '-') breaks.push([text.slice(0, i + 1), text.slice(i + 1)]);
  }
  breaks.forEach((lines) => out.push(lines));
  return out;
}

/**
 * How to print `label` in a wedge `stepDegrees` wide.
 * @returns {{ lines: { text: string, radius: number, squeeze: number|null }[], size: number }}
 */
export function fitRingLabel(label, stepDegrees, { radius = 70, lineGap = 9, singleOnly = false } = {}) {
  const options = singleOnly ? [[String(label || '')]] : arrangements(label);
  let best = null;
  options.forEach((lines) => {
    const radii = lines.length === 1 ? [radius] : [radius + lineGap / 2, radius - lineGap / 2];
    // A label flipped upright on the lower half swaps its lines between the
    // two radii, so both lines are measured against the narrower inner one.
    const roomRadius = Math.min(...radii);
    const fits = lines.map((text) => roomAt(roomRadius, stepDegrees) / Math.max(1, text.length * GLYPH));
    let size = Math.min(RING_LABEL_MAX, ...fits);
    if (lines.length > 1) size = Math.min(size, lineGap * 0.95);
    if (!best || size > best.size + 0.25) best = { lines, radii, size };
  });
  const size = Math.max(RING_LABEL_MIN, best.size);
  return {
    size: Number(size.toFixed(2)),
    lines: best.lines.map((text, index) => {
      const room = roomAt(Math.min(...best.radii), stepDegrees);
      return {
        text,
        radius: best.radii[index],
        squeeze: textWidth(text, size) > room ? Number(room.toFixed(2)) : null,
      };
    }),
  };
}

/**
 * Labels for a whole wheel. Most share one size, so short names are not
 * huge beside long ones: the size that three in four labels can manage.
 * Longer names below that size keep their own smaller fit.
 */
export function fitRingLabels(labels, stepDegrees, options = {}) {
  const fits = labels.map((label, index) => fitRingLabel(label, stepDegrees, typeof options === 'function' ? options(index) : options));
  if (!fits.length) return fits;
  const sizes = fits.map((fit) => fit.size).sort((a, b) => a - b);
  const shared = sizes[Math.floor((sizes.length - 1) * 0.25)];
  return fits.map((fit) => (fit.size > shared ? { ...fit, size: shared } : fit));
}

/** Whether a label at this angle on screen would read upside down. */
export function readsUpsideDown(angle) {
  const turned = ((angle % 360) + 360) % 360;
  return turned > 90 && turned < 270;
}
