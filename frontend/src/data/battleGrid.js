/**
 * Square-grid geometry for battle maps, encounters and combat.
 *
 * A battle map is a grid of squares; every token (player, enemy, NPC)
 * stands on one square, given as { col, row } counted from the top-left,
 * starting at 0. Pixels only exist on screen, so drawing code converts with
 * cellToPixels / pixelsToCell and everything else works in squares.
 *
 * Distance follows the 5e rules. Each square is `feetPerSquare` feet
 * (5 by default). Moving diagonally:
 *   - 'standard'    every square counts the same, diagonal or not
 *                   (the Player's Handbook rule, 2014 and 2024).
 *   - 'alternating' the optional rule in the Dungeon Master's Guide:
 *                   the first diagonal is 5 ft, the second 10 ft, and so on.
 */

export const DEFAULT_FEET_PER_SQUARE = 5;
export const DIAGONAL_RULES = ['standard', 'alternating'];

/** Size presets for a new battle map, in squares. */
export const BATTLE_MAP_SIZES = [
  { id: 'small', name: 'Small', cols: 15, rows: 10, hint: 'A room, a clearing, a short skirmish' },
  { id: 'medium', name: 'Medium', cols: 20, rows: 15, hint: 'A tavern, a camp, a road ambush' },
  { id: 'large', name: 'Large', cols: 30, rows: 20, hint: 'A courtyard, a battlefield, a chase' },
];

const whole = (value, fallback = 0) => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? number : fallback;
};

/** Keep a square inside the map. */
export function clampCell({ col, row }, cols, rows) {
  return {
    col: Math.max(0, Math.min(Math.max(1, whole(cols, 1)) - 1, whole(col))),
    row: Math.max(0, Math.min(Math.max(1, whole(rows, 1)) - 1, whole(row))),
  };
}

/** The square a point on screen falls in (point in pixels from the map's top-left). */
export function pixelsToCell(x, y, cellPixels, cols = Infinity, rows = Infinity) {
  const size = Math.max(1, Number(cellPixels) || 1);
  const cell = { col: Math.floor(Number(x) / size), row: Math.floor(Number(y) / size) };
  return Number.isFinite(cols) && Number.isFinite(rows) ? clampCell(cell, cols, rows) : cell;
}

/** The centre of a square, in pixels, for drawing a token on it. */
export function cellToPixels({ col, row }, cellPixels) {
  const size = Math.max(1, Number(cellPixels) || 1);
  return { x: (whole(col) + 0.5) * size, y: (whole(row) + 0.5) * size };
}

/** Squares moved between two squares, counted per the diagonal rule. */
export function squaresBetween(from, to, diagonalRule = 'standard') {
  const dx = Math.abs(whole(to?.col) - whole(from?.col));
  const dy = Math.abs(whole(to?.row) - whole(from?.row));
  const diagonal = Math.min(dx, dy);
  const straight = Math.max(dx, dy) - diagonal;
  if (diagonalRule === 'alternating') {
    // Every second diagonal costs an extra square: 5, 10, 5, 10...
    return straight + diagonal + Math.floor(diagonal / 2);
  }
  return straight + diagonal;
}

/** Distance in feet between two squares. */
export function distanceFeet(from, to, { feetPerSquare = DEFAULT_FEET_PER_SQUARE, diagonalRule = 'standard' } = {}) {
  const feet = Math.max(1, whole(feetPerSquare, DEFAULT_FEET_PER_SQUARE));
  return squaresBetween(from, to, diagonalRule) * feet;
}

/** Can a creature with this speed (feet) reach `to` from `from` this turn? */
export function withinReach(from, to, speedFeet, options = {}) {
  return distanceFeet(from, to, options) <= Math.max(0, Number(speedFeet) || 0);
}

/**
 * Every square a creature can reach, for drawing its movement range.
 * Ignores walls and difficult terrain: it is a guide for the table, not a
 * path-finder.
 */
export function reachableCells(from, speedFeet, cols, rows, options = {}) {
  const feet = Math.max(1, whole(options.feetPerSquare, DEFAULT_FEET_PER_SQUARE));
  const range = Math.floor(Math.max(0, Number(speedFeet) || 0) / feet);
  const cells = [];
  for (let row = Math.max(0, from.row - range); row <= Math.min(rows - 1, from.row + range); row += 1) {
    for (let col = Math.max(0, from.col - range); col <= Math.min(cols - 1, from.col + range); col += 1) {
      if (withinReach(from, { col, row }, speedFeet, options)) cells.push({ col, row });
    }
  }
  return cells;
}

/** A token's square from what is stored on it: grid squares first, older percentages after. */
export function tokenCell(token, cols, rows) {
  if (Number.isFinite(Number(token?.col)) && Number.isFinite(Number(token?.row))) {
    return clampCell({ col: token.col, row: token.row }, cols, rows);
  }
  // Older encounters stored x/y as a percentage of the map.
  if (Number.isFinite(Number(token?.x)) && Number.isFinite(Number(token?.y))) {
    return clampCell({ col: Math.floor((Number(token.x) / 100) * cols), row: Math.floor((Number(token.y) / 100) * rows) }, cols, rows);
  }
  return null;
}

/** Plain words for a measurement: "30 ft (6 squares)". */
export function describeDistance(from, to, options = {}) {
  const squares = squaresBetween(from, to, options.diagonalRule);
  const feet = distanceFeet(from, to, options);
  return `${feet} ft (${squares} ${squares === 1 ? 'square' : 'squares'})`;
}

/**
 * A creature's walking speed in feet from however it was stored: a number,
 * "30 ft., fly 60 ft." (the first number), or { walk: 30 }. Defaults to 30.
 */
export function walkingSpeedFeet(speed, fallback = 30) {
  if (Number.isFinite(Number(speed)) && Number(speed) > 0) return Number(speed);
  if (speed && typeof speed === 'object') return walkingSpeedFeet(speed.walk ?? speed.walking, fallback);
  const match = String(speed || '').match(/\d+/);
  return match ? Number(match[0]) : fallback;
}
