import { fogStorageKey } from '@/lib/fogOfWar';

export const DEFAULT_TACTICAL = Object.freeze({
  grid: false,
  columns: 24,
  ruler: null,
  showRuler: false,
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
  };
}

export function gridRows(columns, width, height) {
  const cols = Math.max(4, Math.min(60, Math.round(Number(columns) || 24)));
  const w = Number(width), h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return cols;
  return Math.max(1, Math.min(100, Math.round(cols * h / w)));
}

export function rulerFeet(tactical, imageWidth, imageHeight) {
  const data = normaliseTactical(tactical);
  if (!data.ruler) return null;
  const cols = data.columns;
  const rows = gridRows(cols, imageWidth, imageHeight);
  const dx = (data.ruler.end.x - data.ruler.start.x) / 100 * cols;
  const dy = (data.ruler.end.y - data.ruler.start.y) / 100 * rows;
  const feet = 5 * Math.hypot(dx, dy);
  return Math.round(feet);
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
