import { centredHex, hexBox, hexFromWheel, isMostlyOnScreen, locateHexWindow } from './hexWindow';

test('a pointed-top hexagon box is sqrt(3) r wide and 2r tall', () => {
  const box = hexBox(100, 200, 50);
  expect(box.height).toBe(100);
  expect(box.width).toBeCloseTo(86.6, 1);
  expect(box.left).toBeCloseTo(100 - 43.3, 1);
  expect(box.top).toBe(150);
});

test('measures a wheel case from its SVG box, viewBox and radius', () => {
  // The sheet's wheel: viewBox -91 -104 182 208, drawn 364 x 416 px at (13, 100).
  const hex = hexFromWheel({ left: 13, top: 100, width: 364, height: 416 }, { x: -91, y: -104, width: 182, height: 208 }, 100);
  expect(hex.cx).toBeCloseTo(13 + 182, 5);
  expect(hex.cy).toBeCloseTo(100 + 208, 5);
  expect(hex.r).toBeCloseTo(200, 5);
});

test('letterboxing (meet) keeps the case centred', () => {
  const hex = hexFromWheel({ left: 0, top: 0, width: 400, height: 208 }, { x: -91, y: -104, width: 182, height: 208 }, 100);
  expect(hex.cx).toBeCloseTo(200, 5);
  expect(hex.r).toBeCloseTo(100, 5);
});

test('with no wheel, the window is a centred hexagon that fits a phone', () => {
  const hex = centredHex(390, 844);
  expect(hex.cx).toBe(195);
  expect(hex.width).toBeLessThanOrEqual(390);
  expect(locateHexWindow('.nothing-here', document).cx).toBe(window.innerWidth / 2);
});

test('a wheel mostly scrolled away is no anchor: only a nearly whole hexagon is used', () => {
  expect(isMostlyOnScreen(hexBox(195, 400, 200), 844)).toBe(true);
  expect(isMostlyOnScreen(hexBox(195, -150, 200), 844)).toBe(false); // only its bottom shows
  expect(isMostlyOnScreen(hexBox(195, 820, 200), 844)).toBe(false); // mostly below the fold
});
