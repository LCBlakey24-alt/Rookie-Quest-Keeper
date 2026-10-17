import { snapTokenPercent, tokenStorageKey, saveTokenPositions, loadTokenPositions } from './vttTokenGeometry';
test('snap moves to grid square centres and clamps outside clicks', () => {
  expect(snapTokenPercent(20, 30, 10, 10, true)).toEqual({ x: 25, y: 35 });
  expect(snapTokenPercent(20, 30, 10, 10, false)).toEqual({ x: 20, y: 30 });
  expect(snapTokenPercent(-50, 250, 10, 10)).toEqual({ x: 1, y: 99 });
});
test('token positions persist per campaign/map and ignore malformed payloads', () => {
  const m = new Map(); const store = { getItem: k => m.get(k), setItem: (k,v) => m.set(k,v) };
  const url = 'data:image/png;base64,' + 'X'.repeat(50000);
  saveTokenPositions('eldritch',url, { goblin: { x: 41, y: 52 } },store);
  expect(loadTokenPositions('eldritch',url,store)).toEqual({ goblin: { x: 41, y: 52 } });
  expect(loadTokenPositions('other',url,store)).toEqual({});
  expect(tokenStorageKey('eldritch',url).length).toBeLessThan(120);
});
