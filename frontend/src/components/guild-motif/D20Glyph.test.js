import { d20GlyphGeometry } from './D20Glyph';

test('the d20 symbol is a hexagon around a front triangle, with three edges from each triangle corner', () => {
  const { hex, triangle, spokes } = d20GlyphGeometry(20);
  expect(hex).toHaveLength(6);
  expect(hex[0]).toEqual([0, -20]); // a point at the top, like the sheet's hexagons
  expect(triangle).toHaveLength(3);
  expect(spokes).toHaveLength(9);
  triangle.forEach((corner) => {
    expect(spokes.filter(([from]) => from === corner)).toHaveLength(3);
  });
  // The triangle sits inside the hexagon.
  triangle.forEach(([x, y]) => expect(Math.hypot(x, y)).toBeLessThan(20));
});
