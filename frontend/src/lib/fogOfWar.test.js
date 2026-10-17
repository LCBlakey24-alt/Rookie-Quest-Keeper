import { EMPTY_FOG, normaliseFog, isPointRevealed, fogStorageKey, loadFog, saveFog, addFogReveal } from './fogOfWar';

test('starts uncovered and reveals only explicit safe coordinates', () => {
  expect(isPointRevealed(EMPTY_FOG, 12, 50)).toBe(true);
  expect(isPointRevealed({ enabled: true, reveals: [] }, 12, 50)).toBe(false);
  const fog = addFogReveal({ enabled: true, reveals: [] }, 50, 50, 12);
  expect(isPointRevealed(fog, 50, 52)).toBe(true);
  expect(isPointRevealed(fog, 70, 70)).toBe(false);
});

test('rejects malformed or oversized reveal inputs', () => {
  const valid = Array.from({ length: 405 }, () => ({ x: 50, y: 50, radius: 10 }));
  const fog = normaliseFog({ enabled: true, reveals: [{ x: 'NaN', y: 50, radius: 5 }, { x: -30, y: 30, radius: 4 }, ...valid] });
  expect(fog.reveals).toHaveLength(398);
  expect(addFogReveal(fog, 30, 40, 50).reveals).toHaveLength(398);
});

test('saves separate fog by map and campaign without storing huge URL in key', () => {
  const values = new Map();
  const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
  const map = 'data:image/png;base64,' + 'a'.repeat(100000);
  saveFog('quest-1', map, { enabled: true, reveals: [{ x: 10, y: 20, radius: 8 }] }, storage);
  expect(fogStorageKey('quest-1', map).length).toBeLessThan(100);
  expect(loadFog('quest-1', map, storage).reveals).toHaveLength(1);
  expect(loadFog('quest-1', 'different-map', storage).enabled).toBe(false);
  expect(loadFog('quest-2', map, storage).reveals).toHaveLength(0);
});
