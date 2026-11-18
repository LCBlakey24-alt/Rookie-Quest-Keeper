import {
  BATTLE_MAP_SIZES, cellToPixels, clampCell, describeDistance, distanceFeet,
  pixelsToCell, reachableCells, squaresBetween, tokenCell, withinReach,
} from './battleGrid';

describe('squares and pixels', () => {
  test('a point snaps to the square it falls in', () => {
    expect(pixelsToCell(0, 0, 40)).toEqual({ col: 0, row: 0 });
    expect(pixelsToCell(39, 79, 40)).toEqual({ col: 0, row: 1 });
    expect(pixelsToCell(41, 80, 40)).toEqual({ col: 1, row: 2 });
  });

  test('a point off the map snaps to the nearest edge square', () => {
    expect(pixelsToCell(-10, 9999, 40, 15, 10)).toEqual({ col: 0, row: 9 });
    expect(clampCell({ col: 99, row: -3 }, 15, 10)).toEqual({ col: 14, row: 0 });
  });

  test('a token is drawn in the middle of its square', () => {
    expect(cellToPixels({ col: 2, row: 1 }, 40)).toEqual({ x: 100, y: 60 });
  });
});

describe('5e distance', () => {
  const a = { col: 0, row: 0 };
  test('straight lines count every square', () => {
    expect(distanceFeet(a, { col: 6, row: 0 })).toBe(30);
  });

  test('standard rule: a diagonal square costs 5 ft', () => {
    expect(squaresBetween(a, { col: 4, row: 4 })).toBe(4);
    expect(distanceFeet(a, { col: 4, row: 4 })).toBe(20);
    expect(distanceFeet(a, { col: 6, row: 2 })).toBe(30);
  });

  test('alternating rule: diagonals cost 5, 10, 5, 10…', () => {
    expect(distanceFeet(a, { col: 1, row: 1 }, { diagonalRule: 'alternating' })).toBe(5);
    expect(distanceFeet(a, { col: 2, row: 2 }, { diagonalRule: 'alternating' })).toBe(15);
    expect(distanceFeet(a, { col: 4, row: 4 }, { diagonalRule: 'alternating' })).toBe(30);
    expect(distanceFeet(a, { col: 6, row: 2 }, { diagonalRule: 'alternating' })).toBe(35);
  });

  test('a map can use a different square size', () => {
    expect(distanceFeet(a, { col: 3, row: 0 }, { feetPerSquare: 10 })).toBe(30);
  });

  test('says the distance in plain words', () => {
    expect(describeDistance(a, { col: 6, row: 0 })).toBe('30 ft (6 squares)');
    expect(describeDistance(a, { col: 1, row: 0 })).toBe('5 ft (1 square)');
  });
});

describe('movement', () => {
  test('a 30 ft speed reaches 6 squares, diagonals included', () => {
    expect(withinReach({ col: 5, row: 5 }, { col: 11, row: 11 }, 30)).toBe(true);
    expect(withinReach({ col: 5, row: 5 }, { col: 12, row: 5 }, 30)).toBe(false);
  });

  test('reachable squares stay on the map', () => {
    const cells = reachableCells({ col: 0, row: 0 }, 10, 15, 10);
    expect(cells).toHaveLength(9);
    expect(cells.every(({ col, row }) => col >= 0 && row >= 0)).toBe(true);
  });
});

describe('tokens', () => {
  test('grid squares are used when stored', () => {
    expect(tokenCell({ col: 3, row: 4 }, 15, 10)).toEqual({ col: 3, row: 4 });
  });

  test('older percentage positions are converted to a square', () => {
    expect(tokenCell({ x: 50, y: 50 }, 20, 10)).toEqual({ col: 10, row: 5 });
  });

  test('a token with no position has no square', () => {
    expect(tokenCell({}, 20, 10)).toBeNull();
  });
});

test('size presets are small battle areas', () => {
  expect(BATTLE_MAP_SIZES.map((size) => [size.cols, size.rows])).toEqual([[15, 10], [20, 15], [30, 20]]);
});
