/**
 * Geometry for the pointed-top hexagonal wheel.
 *
 * Everything is in SVG user units around the origin, y pointing down. The
 * outer and inner hexagons share an orientation: a point at the top and a
 * point at the bottom, flat vertical sides left and right.
 *
 * Vertices are numbered clockwise from the top point:
 *
 *            0
 *        5       1
 *        4       2
 *            3
 *
 * Slot k is the wedge between vertex k and vertex k + 1, so the six slots
 * run clockwise starting with the upper-right edge:
 *
 *   0 upper-right   1 right   2 lower-right
 *   3 lower-left    4 left    5 upper-left
 */

export const OUTER_RADIUS = 100;
export const INNER_RADIUS = 40;

export const SLOT = Object.freeze({
  UPPER_RIGHT: 0,
  RIGHT: 1,
  LOWER_RIGHT: 2,
  LOWER_LEFT: 3,
  LEFT: 4,
  UPPER_LEFT: 5,
});

/** Slots in reading order: clockwise from the upper-left edge. */
export const READING_ORDER = [SLOT.UPPER_LEFT, SLOT.UPPER_RIGHT, SLOT.RIGHT, SLOT.LOWER_RIGHT, SLOT.LOWER_LEFT, SLOT.LEFT];

const round = (value) => Math.round(value * 1000) / 1000;

export function hexVertex(index, radius) {
  const angle = ((-90 + 60 * index) * Math.PI) / 180;
  return [round(radius * Math.cos(angle)), round(radius * Math.sin(angle))];
}

export function hexVertices(radius) {
  return Array.from({ length: 6 }, (_, index) => hexVertex(index, radius));
}

export function pointsAttribute(points) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/** The four corners of wedge `slot`: outer edge first, then inner edge. */
export function wedgePolygon(slot, outer = OUTER_RADIUS, inner = INNER_RADIUS) {
  const next = (slot + 1) % 6;
  return [hexVertex(slot, outer), hexVertex(next, outer), hexVertex(next, inner), hexVertex(slot, inner)];
}

/** Centre of a wedge's area, where its main label or number sits. */
export function wedgeCentre(slot, outer = OUTER_RADIUS, inner = INNER_RADIUS) {
  const points = wedgePolygon(slot, outer, inner);
  return [
    round(points.reduce((sum, [x]) => sum + x, 0) / points.length),
    round(points.reduce((sum, [, y]) => sum + y, 0) / points.length),
  ];
}

/**
 * The rotation that lays text along a slot's edge and keeps it readable.
 *
 * Text follows the edge's direction, but never runs upside down: anything
 * past vertical is turned half a circle. The left side reads bottom-to-top
 * and the right side top-to-bottom, as in the reference sketch.
 */
export function edgeTextRotation(slot) {
  const [x1, y1] = hexVertex(slot, OUTER_RADIUS);
  const [x2, y2] = hexVertex((slot + 1) % 6, OUTER_RADIUS);
  let angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return Math.round(angle);
}

/**
 * A point just inside the outer edge of a slot, for text that runs along
 * that edge. `inset` is how far in from the edge, in user units.
 */
export function edgeLabelPoint(slot, inset = 11, outer = OUTER_RADIUS) {
  const [x1, y1] = hexVertex(slot, outer);
  const [x2, y2] = hexVertex((slot + 1) % 6, outer);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const distance = Math.hypot(midX, midY) || 1;
  return [round(midX - (midX / distance) * inset), round(midY - (midY / distance) * inset)];
}

/**
 * Font size that fits `text` into `maxWidth` user units, capped at `base`.
 * Uses an average glyph width, which is all a label this size needs.
 */
export function fitFontSize(text, maxWidth, base, minimum = 5.5) {
  const characters = Math.max(1, String(text || '').length);
  return Math.max(minimum, Math.min(base, maxWidth / (characters * 0.58)));
}

/** viewBox that frames the outer hexagon with a little breathing room. */
export function wheelViewBox(outer = OUTER_RADIUS, margin = 4) {
  const halfWidth = outer * Math.cos(Math.PI / 6) + margin;
  const halfHeight = outer + margin;
  return `${round(-halfWidth)} ${round(-halfHeight)} ${round(halfWidth * 2)} ${round(halfHeight * 2)}`;
}

/*
 * The round ring of wedges inside the hexagon (the approved wheel: a ring,
 * not triangular hexagon slices). Angles are degrees clockwise from the top.
 * The ring's outer edge stays inside the hexagon's flat sides (86.6).
 */
export const RING_OUTER = 84;
export const RING_INNER = 42;

export function polarPoint(degrees, radius) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [round(radius * Math.cos(radians)), round(radius * Math.sin(radians))];
}

/**
 * A ring segment from `start` to `end` degrees as polygon points: the outer
 * arc clockwise, then the inner arc back. `gap` trims each end (in degrees)
 * so neighbouring segments sit apart.
 */
export function ringSegment(start, end, { outer = RING_OUTER, inner = RING_INNER, gap = 1.6, steps = 14 } = {}) {
  const from = start + gap / 2;
  const to = end - gap / 2;
  const arc = (radius, a, b) => Array.from({ length: steps + 1 }, (_, i) => polarPoint(a + ((b - a) * i) / steps, radius));
  return [...arc(outer, from, to), ...arc(inner, to, from)];
}

/** The ring segment for hexagon slot `slot`, centred on that slot's edge. */
export function slotSegment(slot, options) {
  return ringSegment(60 * slot, 60 * slot + 60, options);
}

/** Angle (degrees clockwise from the top) through the middle of `slot`. */
export function slotAngle(slot) {
  return 60 * slot + 30;
}
