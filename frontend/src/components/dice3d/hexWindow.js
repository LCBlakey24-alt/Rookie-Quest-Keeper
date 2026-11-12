/**
 * Where the hexagon dice window goes.
 *
 * On the character sheet the throw appears in a hexagon laid exactly over
 * the wheel's own hexagon case. A wheel marks its SVG with the case's
 * circumradius in its own units (data-hex-radius); the case is centred on
 * the viewBox origin, as all the sheet's wheels are. With no wheel on
 * screen the window is a hexagon in the middle of the viewport.
 *
 * Kept free of React so it can be tested.
 */

export const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
const SQRT3_2 = Math.sqrt(3) / 2;

/** The window's box for a pointed-top hexagon of circumradius r at (cx, cy). */
export function hexBox(cx, cy, r) {
  return { cx, cy, r, left: cx - r * SQRT3_2, top: cy - r, width: 2 * r * SQRT3_2, height: 2 * r };
}

/**
 * The case hexagon of an SVG wheel, in viewport pixels.
 * `rect` is its bounding client rect, `viewBox` {x, y, width, height}, and
 * `radius` the case's circumradius in viewBox units. Assumes the default
 * preserveAspectRatio (xMidYMid meet).
 */
export function hexFromWheel(rect, viewBox, radius) {
  if (!rect || !viewBox || !viewBox.width || !viewBox.height || !(radius > 0)) return null;
  const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
  if (!(scale > 0)) return null;
  const offsetX = rect.left + (rect.width - viewBox.width * scale) / 2;
  const offsetY = rect.top + (rect.height - viewBox.height * scale) / 2;
  return hexBox(offsetX - viewBox.x * scale, offsetY - viewBox.y * scale, radius * scale);
}

/** A centred hexagon that fits the viewport with room to spare. */
export function centredHex(viewportWidth, viewportHeight) {
  const r = Math.max(120, Math.min(viewportWidth * 0.48 / SQRT3_2, viewportHeight * 0.34, 240));
  return hexBox(viewportWidth / 2, viewportHeight / 2, r);
}

/** At most a tenth of the hexagon may be cut off at the top or bottom. */
export function isMostlyOnScreen(hex, viewportHeight) {
  const allowance = hex.height * 0.1;
  return hex.top >= -allowance && hex.top + hex.height <= viewportHeight + allowance;
}

/** Find the wheel matching `selector` and measure its hexagon, or centre one. */
export function locateHexWindow(selector, doc = typeof document !== 'undefined' ? document : null) {
  const view = doc?.defaultView;
  const width = view?.innerWidth || 390;
  const height = view?.innerHeight || 844;
  const element = selector && doc ? doc.querySelector(selector) : null;
  if (element) {
    const rect = element.getBoundingClientRect();
    const box = element.viewBox?.baseVal;
    const measured = hexFromWheel(rect, box && { x: box.x, y: box.y, width: box.width, height: box.height }, Number(element.getAttribute('data-hex-radius')));
    // Only anchor to a wheel that is (almost) fully on screen, so the dice and
    // the total in the hexagon's lower part can be read; otherwise centre it.
    if (measured && isMostlyOnScreen(measured, height)) return measured;
  }
  return centredHex(width, height);
}
