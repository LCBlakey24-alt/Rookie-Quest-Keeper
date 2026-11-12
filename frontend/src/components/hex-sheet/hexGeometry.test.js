import {
  OUTER_RADIUS, SLOT, edgeLabelPoint, edgeTextRotation, fitFontSize, hexVertex, hexVertices, wedgeCentre, wedgePolygon,
} from './hexGeometry';

describe('the hexagon points up and down', () => {
  test('a vertex sits at the very top and the very bottom', () => {
    expect(hexVertex(0, 100)).toEqual([0, -100]);
    expect(hexVertex(3, 100)).toEqual([0, 100]);
  });

  test('the left and right sides are vertical, not the top and bottom', () => {
    const [, right1, right2, , left1, left2] = hexVertices(100);
    expect(right1[0]).toBeCloseTo(right2[0]);
    expect(left1[0]).toBeCloseTo(left2[0]);
  });
});

describe('wedges', () => {
  test('each wedge spans one outer edge and the matching inner edge', () => {
    const [outerA, outerB, innerB, innerA] = wedgePolygon(SLOT.UPPER_LEFT, 100, 40);
    expect(outerA).toEqual(hexVertex(5, 100));
    expect(outerB).toEqual(hexVertex(0, 100));
    expect(innerB).toEqual(hexVertex(0, 40));
    expect(innerA).toEqual(hexVertex(5, 40));
  });

  test.each([
    ['UPPER_LEFT', (x, y) => x < 0 && y < 0],
    ['UPPER_RIGHT', (x, y) => x > 0 && y < 0],
    ['RIGHT', (x, y) => x > 0 && Math.abs(y) < 1],
    ['LOWER_RIGHT', (x, y) => x > 0 && y > 0],
    ['LOWER_LEFT', (x, y) => x < 0 && y > 0],
    ['LEFT', (x, y) => x < 0 && Math.abs(y) < 1],
  ])('the %s wedge sits where its name says', (name, where) => {
    const [x, y] = wedgeCentre(SLOT[name]);
    expect(where(x, y)).toBe(true);
  });
});

describe('text follows the edges, as in the sketch, and never reads upside down', () => {
  test.each([
    ['UPPER_LEFT', -30],  // Core Abilities rises to the right
    ['UPPER_RIGHT', 30],  // Skills falls to the right
    ['RIGHT', 90],        // Magic reads top to bottom
    ['LOWER_RIGHT', -30], // Combat rises to the right
    ['LOWER_LEFT', 30],   // Traits & Feats falls to the right
    ['LEFT', -90],        // Equipment reads bottom to top
  ])('%s is rotated %i degrees', (name, degrees) => {
    expect(edgeTextRotation(SLOT[name])).toBe(degrees);
  });

  test('every rotation keeps text the right way up', () => {
    Object.values(SLOT).forEach((slot) => {
      expect(Math.abs(edgeTextRotation(slot))).toBeLessThanOrEqual(90);
    });
  });
});

test('edge labels sit just inside the outer edge, never outside the wheel', () => {
  Object.values(SLOT).forEach((slot) => {
    const [x, y] = edgeLabelPoint(slot, 9);
    const distance = Math.hypot(x, y);
    expect(distance).toBeLessThan(OUTER_RADIUS * Math.cos(Math.PI / 6));
    expect(distance).toBeGreaterThan(OUTER_RADIUS * 0.6);
  });
});

test('long labels shrink to fit and short ones keep the base size', () => {
  expect(fitFontSize('D4', 60, 10)).toBe(10);
  expect(fitFontSize('A very long section name here', 60, 10)).toBeLessThan(10);
  expect(fitFontSize('x'.repeat(200), 60, 10)).toBe(5.5);
});
