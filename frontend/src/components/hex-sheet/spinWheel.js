/**
 * The spinning wheel's arithmetic, kept free of React so it can be tested.
 *
 * A section that needs three choices uses three wedges, each covering two
 * of the hexagon's six slices and centred on a corner. Wedge 0 starts at
 * the top. Turning the wheel by 120 degrees brings the next wedge to the
 * top and leaves the hexagon's outline exactly where it was, so the wheel
 * always settles squarely. Whichever wedge rests at the top is selected.
 */
import { INNER_RADIUS, OUTER_RADIUS, hexVertex } from './hexGeometry';

export const SPIN_SECTORS = 3;
export const SPIN_STEP = 360 / SPIN_SECTORS;

const wrap = (index, count) => ((index % count) + count) % count;

/** The wedge polygon for sector `index` of a three-wedge wheel, unrotated. */
export function sectorPolygon(index) {
  const corner = 2 * index;
  const O = (i) => hexVertex(wrap(i, 6), OUTER_RADIUS);
  const I = (i) => hexVertex(wrap(i, 6), INNER_RADIUS);
  return [O(corner - 1), O(corner), O(corner + 1), I(corner + 1), I(corner), I(corner - 1)];
}

/** Where a sector's label sits, unrotated: towards its corner. */
export function sectorLabelPoint(index, radius = 70) {
  return hexVertex(wrap(2 * index, 6), radius);
}

/** The sector resting at the top for a given total rotation (degrees). */
export function sectorAtTop(rotation, count = SPIN_SECTORS) {
  return wrap(Math.round(-rotation / (360 / count)), count);
}

/**
 * The rotation that puts `index` at the top, choosing the nearest such
 * angle to `from` so the wheel turns the short way round.
 */
export function rotationForSector(index, from = 0, count = SPIN_SECTORS) {
  const step = 360 / count;
  const base = -index * step;
  const turns = Math.round((from - base) / 360);
  return base + turns * 360 + 0; // never -0
}

/** Where a released wheel settles: the nearest whole sector. */
export function settleRotation(rotation, count = SPIN_SECTORS) {
  const step = 360 / count;
  return Math.round(rotation / step) * step + 0; // never -0
}
