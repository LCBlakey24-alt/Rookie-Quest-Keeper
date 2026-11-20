/**
 * A square or hex grid laid over an uploaded map image (world, city, town,
 * village or battle). Everything is relative to the image so the grid stays
 * locked to the artwork at any screen size or zoom:
 *   size     one cell's width as a percentage of the image width
 *   offset_x / offset_y   how far the grid is shifted, as a % of one cell
 * The backend validates the same ranges (models.MapGrid).
 */

export const GRID_TYPES = [
  { id: 'none', label: 'No grid' },
  { id: 'square', label: 'Squares' },
  { id: 'hex_flat', label: 'Hexes, flat top' },
  { id: 'hex_pointy', label: 'Hexes, pointed top' },
];

export const GRID_LIMITS = { minSize: 0.5, maxSize: 50 };

export const DEFAULT_GRID = Object.freeze({
  type: 'none', size: 5, offset_x: 0, offset_y: 0, colour: 'light', opacity: 0.45,
});

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

/** A complete, in-range grid from whatever was saved (or nothing). */
export function normaliseGrid(grid) {
  const source = grid && typeof grid === 'object' ? grid : {};
  const type = GRID_TYPES.some((option) => option.id === source.type) ? source.type : DEFAULT_GRID.type;
  return {
    type,
    size: clamp(source.size, GRID_LIMITS.minSize, GRID_LIMITS.maxSize, DEFAULT_GRID.size),
    offset_x: clamp(source.offset_x, 0, 100, 0),
    offset_y: clamp(source.offset_y, 0, 100, 0),
    colour: source.colour === 'dark' ? 'dark' : 'light',
    opacity: clamp(source.opacity, 0.05, 1, DEFAULT_GRID.opacity),
  };
}

export const hasGrid = (grid) => normaliseGrid(grid).type !== 'none';

/** About how many cells fit across the image, for a readable label. */
export function cellsAcross(grid) {
  const { type, size } = normaliseGrid(grid);
  // Flat-top hexes interlock, so each column after the first adds 3/4 of a width.
  const step = type === 'hex_flat' ? size * 0.75 : size;
  return Math.max(1, Math.round(100 / step));
}

/** Size that gives `count` cells across the image (the inverse of cellsAcross). */
export function sizeForCellsAcross(type, count) {
  const cells = Math.max(1, Number(count) || 1);
  const size = type === 'hex_flat' ? 100 / cells / 0.75 : 100 / cells;
  return clamp(size, GRID_LIMITS.minSize, GRID_LIMITS.maxSize, DEFAULT_GRID.size);
}

const SQRT3 = Math.sqrt(3);

function hexPath(cx, cy, r, pointy) {
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i + (pointy ? 30 : 0));
    points.push(`${(cx + r * Math.cos(angle)).toFixed(4)} ${(cy + r * Math.sin(angle)).toFixed(4)}`);
  }
  return `M${points.join(' L')} Z`;
}

/**
 * The repeating tile for an SVG pattern, in image units where the image is
 * 100 wide: { width, height, path, dx, dy }. dx/dy is the offset shift.
 */
export function gridTile(grid) {
  const g = normaliseGrid(grid);
  const s = g.size;
  if (g.type === 'square') {
    return { width: s, height: s, path: `M${s} 0 L0 0 L0 ${s}`, dx: (g.offset_x / 100) * s, dy: (g.offset_y / 100) * s };
  }
  if (g.type === 'hex_pointy') {
    // Width across the flats is `s`; rows step down 1.5 radii.
    const r = s / SQRT3;
    const centres = [[s / 2, r], [0, -r / 2], [s, -r / 2], [0, 2.5 * r], [s, 2.5 * r], [s / 2, 4 * r]];
    return {
      width: s, height: 3 * r,
      path: centres.map(([x, y]) => hexPath(x, y, r, true)).join(' '),
      dx: (g.offset_x / 100) * s, dy: (g.offset_y / 100) * 3 * r,
    };
  }
  if (g.type === 'hex_flat') {
    // Width point to point is `s`; columns step across 1.5 radii.
    const r = s / 2;
    const h = SQRT3 * r;
    const centres = [[r, h / 2], [2.5 * r, 0], [2.5 * r, h], [-r / 2, 0], [-r / 2, h], [4 * r, h / 2]];
    return {
      width: 3 * r, height: h,
      path: centres.map(([x, y]) => hexPath(x, y, r, false)).join(' '),
      dx: (g.offset_x / 100) * 3 * r, dy: (g.offset_y / 100) * h,
    };
  }
  return null;
}

export const MAX_BATTLE_SQUARES = 80;

/**
 * Where an uploaded battle map's whole squares are, in image pixels: the
 * part of the image from the first grid line to the last complete square.
 * Partial squares at the edges are trimmed so the map is whole squares.
 */
export function battleCrop(imageWidth, imageHeight, grid) {
  const g = normaliseGrid({ ...grid, type: 'square' });
  const cell = (imageWidth * g.size) / 100;
  if (!(cell > 0) || !(imageHeight > 0)) return null;
  const sx = (g.offset_x / 100) * cell;
  const sy = (g.offset_y / 100) * cell;
  const cols = Math.min(MAX_BATTLE_SQUARES, Math.floor((imageWidth - sx) / cell + 1e-6));
  const rows = Math.min(MAX_BATTLE_SQUARES, Math.floor((imageHeight - sy) / cell + 1e-6));
  if (cols < 1 || rows < 1) return null;
  return { sx, sy, sw: cols * cell, sh: rows * cell, cols, rows, cell };
}

/**
 * Crop an uploaded battle map to its whole squares and shrink it if needed,
 * so the picture stretched over the map's squares lines up exactly in the
 * builder, in combat and on the player display. Returns a JPEG data URL.
 */
export function cropBattleImage(image, grid, maxSide = 2600) {
  const crop = battleCrop(image.naturalWidth || image.width, image.naturalHeight || image.height, grid);
  if (!crop) return null;
  const scale = Math.min(1, maxSide / Math.max(crop.sw, crop.sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.sw * scale));
  canvas.height = Math.max(1, Math.round(crop.sh * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.86), cols: crop.cols, rows: crop.rows };
}
