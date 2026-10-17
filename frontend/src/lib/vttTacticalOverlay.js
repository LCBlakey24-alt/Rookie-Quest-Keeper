import { fogStorageKey } from '@/lib/fogOfWar';

export const DEFAULT_TACTICAL = Object.freeze({
  grid: false,
  columns: 24,
  ruler: null,
  showRuler: false,
  effect: 'none',
  mapKind: 'battle',
  partyMarker: null,
});

export function safePoint(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100 ? { x, y } : null;
}

export function normaliseTactical(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TACTICAL };
  const columns = Math.max(4, Math.min(60, Math.round(Number(raw.columns) || 24)));
  const a = safePoint(raw.ruler?.start);
  const b = safePoint(raw.ruler?.end);
  return {
    grid: raw.grid === true,
    columns,
    ruler: a && b ? { start: a, end: b } : null,
    showRuler: raw.showRuler === true && !!(a && b),
    effect: ['none','rain','embers','heat','snow'].includes(raw.effect) ? raw.effect : 'none',
    mapKind: raw.mapKind === 'world' ? 'world' : 'battle',
    partyMarker: safePoint(raw.partyMarker),
  };
}

// Only send an explicitly shared ruler to player-facing displays. A hidden GM
// measurement is never included in player sync traffic.
export function publicTactical(raw) {
  const settings = normaliseTactical(raw);
  return {
    ...settings,
    ruler: settings.showRuler ? settings.ruler : null,
    partyMarker: settings.mapKind === 'world' ? settings.partyMarker : null,
  };
}

/**
 * A full edge-to-edge grid cannot consist of EXACT squares for every image
 * aspect ratio (e.g. an irrational width/height). Choose integer counts near
 * the requested density that minimise pixel distortion instead of cropping
 * or drawing partial cells. The same answer drives drawing, snapping/ruler
 * and the separate LAN spectator renderer.
 */
export function fittedGrid(columns, width, height) {
  const desired = Math.max(4, Math.min(60, Math.round(Number(columns) || 24)));
  const w = Number(width), h = Number(height);
  if (!(w > 0 && h > 0) || !Number.isFinite(w) || !Number.isFinite(h)) return { columns: desired, rows: desired, distortion: 0 };
  let best = null;
  const minCols = Math.max(4, Math.floor(desired * 0.55));
  const maxCols = Math.min(60, Math.ceil(desired * 1.55));
  for (let cols = minCols; cols <= maxCols; cols++) {
    const idealRows = cols * h / w;
    for (const rows of [Math.floor(idealRows), Math.ceil(idealRows)]) {
      if (rows < 1 || rows > 100) continue;
      const distortion = Math.abs(Math.log((w / cols) / (h / rows)));
      const deviation = Math.abs(cols - desired) / desired;
      const score = distortion * 6 + deviation * 0.07;
      if (!best || score < best.score - 1e-10 || (Math.abs(score - best.score) < 1e-10 && cols > best.columns)) best = { columns: cols, rows, distortion, score };
    }
  }
  return best ? { columns: best.columns, rows: best.rows, distortion: best.distortion } : { columns: desired, rows: Math.max(1,Math.round(desired*h/w)), distortion: 0 };
}

export function gridRows(columns, width, height) {
  return fittedGrid(columns, width, height).rows;
}

export function rulerFeet(tactical, imageWidth, imageHeight) {
  const data = normaliseTactical(tactical);
  if (!data.ruler) return null;
  const fitted = fittedGrid(data.columns, imageWidth, imageHeight);
  const dx = (data.ruler.end.x - data.ruler.start.x) / 100 * fitted.columns;
  const dy = (data.ruler.end.y - data.ruler.start.y) / 100 * fitted.rows;
  return Math.round(5 * Math.hypot(dx, dy));
}

export function tacticalStorageKey(campaignId, mapUrl) {
  const fogKey = fogStorageKey(campaignId, mapUrl);
  return fogKey ? fogKey.replace('rqk.vtt.fog.v1.', 'rqk.vtt.tactical.v1.') : '';
}

export function loadTactical(campaignId, mapUrl, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const key = tacticalStorageKey(campaignId, mapUrl);
  if (!key || !storage) return { ...DEFAULT_TACTICAL };
  try { return normaliseTactical(JSON.parse(storage.getItem(key) || 'null')); }
  catch { return { ...DEFAULT_TACTICAL }; }
}

export function saveTactical(campaignId, mapUrl, value, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const key = tacticalStorageKey(campaignId, mapUrl);
  if (!key || !storage) return;
  storage.setItem(key, JSON.stringify(normaliseTactical(value)));
}
