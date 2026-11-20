/**
 * Friend or foe, and where each combatant starts on the battle map.
 *
 * A combatant's side is its own `side` ('ally' or 'enemy') when the GM has
 * set one. Otherwise players and NPCs are allies and creatures are enemies,
 * which is how the combat map has always drawn them.
 *
 * Starting squares are saved on the encounter as `placements`:
 * [{ id, col, row }]. Anyone not placed gets a sensible default: allies down
 * the left edge, enemies down the right.
 */

export const SIDES = ['ally', 'enemy'];

export function combatantSide(combatant) {
  if (SIDES.includes(combatant?.side)) return combatant.side;
  return combatant?.type === 'player' || combatant?.type === 'npc' ? 'ally' : 'enemy';
}

export const otherSide = (side) => (side === 'enemy' ? 'ally' : 'enemy');

const inside = (cell, cols, rows) => cell
  && Number.isInteger(cell.col) && Number.isInteger(cell.row)
  && cell.col >= 0 && cell.row >= 0 && cell.col < cols && cell.row < rows;

/** Allies fill columns from the left, enemies from the right, top to bottom. */
function nextFreeCell(side, taken, cols, rows) {
  const columns = Array.from({ length: cols }, (_, index) => (side === 'enemy' ? cols - 2 - index : 1 + index))
    .filter((col) => col >= 0 && col < cols);
  for (const col of columns) {
    for (let row = 1; row < rows - 1; row += 1) {
      const key = `${col},${row}`;
      if (!taken.has(key)) return { col, row };
    }
  }
  return { col: 0, row: 0 };
}

/**
 * Every combatant's starting square: its saved placement if it is on this
 * map, else a free default square for its side. Returns { [id]: {col,row} }.
 */
export function startingSquares(combatants, placements, cols, rows) {
  const saved = new Map((placements || []).map((item) => [String(item.id), { col: Number(item.col), row: Number(item.row) }]));
  const squares = {};
  const taken = new Set();
  (combatants || []).forEach((combatant) => {
    const cell = saved.get(String(combatant.id));
    if (inside(cell, cols, rows)) {
      squares[combatant.id] = cell;
      taken.add(`${cell.col},${cell.row}`);
    }
  });
  (combatants || []).forEach((combatant) => {
    if (squares[combatant.id]) return;
    const cell = nextFreeCell(combatantSide(combatant), taken, cols, rows);
    squares[combatant.id] = cell;
    taken.add(`${cell.col},${cell.row}`);
  });
  return squares;
}

/** Map tokens (MapCanvas shape: x/y are squares) for an encounter's combatants. */
export function encounterTokens(combatants, placements, cols, rows) {
  const squares = startingSquares(combatants, placements, cols, rows);
  return (combatants || []).map((combatant) => {
    const side = combatantSide(combatant);
    const cell = squares[combatant.id];
    return {
      id: combatant.id,
      name: combatant.name,
      x: cell.col,
      y: cell.row,
      isEnemy: side === 'enemy',
      isAlly: side === 'ally',
      speed: combatant.speed,
    };
  });
}

/** Tokens back to saved placements. */
export const tokensToPlacements = (tokens) => (tokens || []).map((token) => ({ id: String(token.id), col: token.x, row: token.y }));
