// GM-only token interactions. Percent coordinates track the actual map bounds,
// never the surrounding TV letterbox or browser window.
export function clampTokenPercent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(99, n)) : 50;
}

export function snapTokenPercent(x, y, columns, rows, enabled = false) {
  let xx = clampTokenPercent(x);
  let yy = clampTokenPercent(y);
  if (enabled) {
    const cols = Math.max(1, Number(columns) || 24);
    const r = Math.max(1, Number(rows) || 24);
    xx = clampTokenPercent((Math.floor(xx * cols / 100) + .5) * 100 / cols);
    yy = clampTokenPercent((Math.floor(yy * r / 100) + .5) * 100 / r);
  }
  return { x: xx, y: yy };
}

export function tokenStorageKey(campaignId, mapUrl) {
  if (!mapUrl) return '';
  let hash = 2166136261;
  const str = String(mapUrl);
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'rqk.vtt.tokens.v1.' + encodeURIComponent(String(campaignId || 'campaign')) + '.' + (hash >>> 0).toString(16) + '.' + str.length;
}

export function loadTokenPositions(campaignId, mapUrl, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const key = tokenStorageKey(campaignId, mapUrl);
  if (!key || !storage) return {};
  try {
    const raw = JSON.parse(storage.getItem(key) || '{}');
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') return {};
    return Object.fromEntries(Object.entries(raw).slice(0, 120).flatMap(([id, pos]) => {
      if (!id || id.length > 160 || !pos || !Number.isFinite(Number(pos.x)) || !Number.isFinite(Number(pos.y))) return [];
      return [[id, { x: clampTokenPercent(pos.x), y: clampTokenPercent(pos.y) }]];
    }));
  } catch { return {}; }
}

export function saveTokenPositions(campaignId, mapUrl, positions, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const key = tokenStorageKey(campaignId, mapUrl);
  if (!key || !storage) return;
  storage.setItem(key, JSON.stringify(positions));
}
