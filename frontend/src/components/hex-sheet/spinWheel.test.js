import { rotationForSector, sectorAtTop, sectorPolygon, settleRotation } from './spinWheel';
import { RING_INNER, RING_OUTER } from './hexGeometry';

test('wedge 0 is a third of the ring, centred on the top', () => {
  const polygon = sectorPolygon(0);
  const outer = polygon.slice(0, polygon.length / 2);
  const middle = outer[outer.length / 2 - 0.5] || outer[Math.floor(outer.length / 2)];
  expect(middle[0]).toBeCloseTo(0);
  expect(middle[1]).toBeCloseTo(-RING_OUTER);
  polygon.forEach(([x, y]) => {
    const r = Math.hypot(x, y);
    expect(r > RING_INNER - 0.01 && r < RING_OUTER + 0.01).toBe(true);
  });
  // The ends sit just inside +-60 degrees, so the three wedges do not touch.
  expect(outer[0][0]).toBeLessThan(0);
  expect(outer[outer.length - 1][0]).toBeGreaterThan(0);
});

test('the wedge at the top follows the rotation in steps of 120 degrees', () => {
  expect(sectorAtTop(0)).toBe(0);
  expect(sectorAtTop(-120)).toBe(1);
  expect(sectorAtTop(-240)).toBe(2);
  expect(sectorAtTop(120)).toBe(2);
  expect(sectorAtTop(-50)).toBe(0); // not yet half way
  expect(sectorAtTop(-70)).toBe(1);
  expect(sectorAtTop(-360 - 120)).toBe(1);
});

test('a released wheel settles on the nearest wedge', () => {
  expect(settleRotation(-70)).toBe(-120);
  expect(settleRotation(-50)).toBe(0);
  expect(settleRotation(200)).toBe(240);
});

test('choosing a wedge turns the short way round', () => {
  expect(rotationForSector(1, 0)).toBe(-120);
  expect(rotationForSector(2, 0)).toBe(-240 + 360); // +120 is shorter than -240
  expect(rotationForSector(0, -240)).toBe(-360);
});
