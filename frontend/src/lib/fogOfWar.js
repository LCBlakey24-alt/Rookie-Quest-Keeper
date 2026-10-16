// Player-safe, map-specific reveal geometry. Coordinates use 0-100% of the image.
export const EMPTY_FOG = Object.freeze({ enabled: false, reveals: [] });

export function normaliseFog(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FOG };
  const reveals = (Array.isArray(raw.reveals) ? raw.reveals : []).slice(0, 400).flatMap(spot => {
    if (!spot || typeof spot !== 'object') return [];
    const x = Number(spot.x);
    const y = Number(spot.y);
    const radius = Number(spot.radius);
    if (![x, y, radius].every(Number.isFinite)) return [];
    if (x < 0 || x > 100 || y < 0 || y > 100 || radius < 1 || radius > 40) return [];
    return [{ x, y, radius }];
  });
  return { enabled: raw.enabled === true, reveals };
}

export function isPointRevealed(fog, x, y) {
  if (!fog?.enabled) return true;
  const px = Number(x);
  const py = Number(y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return false;
  return normaliseFog(fog).reveals.some(spot => Math.hypot((px - spot.x), (py - spot.y)) <= spot.radius);
}

// Never put a raw data URI in a localStorage key.
export function fogStorageKey(campaignId, mapUrl) {
  const input = String(mapUrl || '');
  if (!input) return '';
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'rqk.vtt.fog.v1.' + encodeURIComponent(String(campaignId || 'campaign')) + '.' + (hash >>> 0).toString(16) + '.' + input.length;
}

export function loadFog(campaignId, mapUrl, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const key = fogStorageKey(campaignId, mapUrl);
  if (!key || !storage) return { ...EMPTY_FOG };
  try { return normaliseFog(JSON.parse(storage.getItem(key) || 'null')); }
  catch { return { ...EMPTY_FOG }; }
}

export function saveFog(campaignId, mapUrl, fog, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const key = fogStorageKey(campaignId, mapUrl);
  if (!key || !storage) return;
  storage.setItem(key, JSON.stringify(normaliseFog(fog)));
}

export function addFogReveal(fog, x, y, radius) {
  const valid = normaliseFog({ enabled: true, reveals: [{ x, y, radius }] });
  if (!valid.reveals.length) return normaliseFog(fog);
  const current = normaliseFog(fog);
  return normaliseFog({ enabled: true, reveals: [...current.reveals, valid.reveals[0]] });
}
