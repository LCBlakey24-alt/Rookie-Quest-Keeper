import { rotationForSector, sectorAtTop, sectorPolygon, settleRotation } from './spinWheel';
import { OUTER_RADIUS } from './hexGeometry';

test('wedge 0 is centred on the top corner and covers two slices', () => {
  const polygon = sectorPolygon(0);
  expect(polygon).toHaveLength(6);
  expect(polygon[1][0]).toBeCloseTo(0);
  expect(polygon[1][1]).toBeCloseTo(-OUTER_RADIUS);
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
