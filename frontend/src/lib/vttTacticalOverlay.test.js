import { normaliseTactical, publicTactical, fittedGrid, gridRows, rulerFeet, tacticalStorageKey, loadTactical, saveTactical } from './vttTacticalOverlay';

describe('map-safe tactical grid and ruler', () => {
  test('defaults to no visible grid or ruler', () => {
    expect(normaliseTactical(null)).toMatchObject({ grid: false, ruler: null, showRuler: false });
  });

  test('measures map distance using calibrated square cells in a 16:9 image', () => {
    const t = normaliseTactical({ grid: true, columns: 24, ruler: { start: { x: 0, y: 0 }, end: { x: 25, y: 0 } }, showRuler: true });
    expect(rulerFeet(t, 1920, 1080)).toBe(40);
    expect(fittedGrid(24, 1920, 1080)).toMatchObject({ columns: 32, rows: 18 });
    expect(rulerFeet({ ...t, ruler: null }, 1920, 1080)).toBeNull();
  });

  test('rejects invalid points and out-of-range grid sizes', () => {
    expect(normaliseTactical({ grid: true, columns: 999, showRuler: true, ruler: { start: { x: -1, y: 0 }, end: { x: 10, y: 10 } } })).toEqual({
      grid: true, columns: 60, ruler: null, showRuler: false, effect: 'none', mapKind: 'battle', partyMarker: null,
    });
    expect(fittedGrid(24, 1080, 1920)).toMatchObject({ columns: 18, rows: 32 });
  });

  test('persists independently for each map without writing image content into storage key', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    const hugeMap = 'data:image/png;base64,' + 'x'.repeat(100000);
    const cfg = { grid: true, columns: 36, ruler: { start: { x: 10, y: 20 }, end: { x: 30, y: 40 } }, showRuler: false };
    saveTactical('gm-campaign', hugeMap, cfg, storage);
    expect(tacticalStorageKey('gm-campaign', hugeMap).length).toBeLessThan(100);
    expect(loadTactical('gm-campaign', hugeMap, storage)).toMatchObject(cfg);
    expect(loadTactical('gm-campaign', 'other', storage).grid).toBe(false);
  });
});

test('unshared GM ruler endpoints are absent from player sync state', () => {
  const ruler = { start: { x: 4, y: 8 }, end: { x: 31, y: 76 } };
  expect(publicTactical({ grid: true, columns: 24, ruler, showRuler: false })).toEqual({
    grid: true, columns: 24, ruler: null, showRuler: false, effect: 'none', mapKind: 'battle', partyMarker: null,
  });
  expect(publicTactical({ grid: true, columns: 24, ruler, showRuler: true }).ruler).toEqual(ruler);
});

test('edge-to-edge calibration creates whole cells with no cropped row on odd aspect ratios', () => {
  for (const [w,h] of [[1920,1080],[1080,1920],[1024,768],[1503,997],[2048,2048]]) {
    const fit=fittedGrid(24,w,h);
    expect(Number.isInteger(fit.columns)).toBe(true);
    expect(Number.isInteger(fit.rows)).toBe(true);
    expect(fit.distortion).toBeLessThan(0.06);
  }
});
