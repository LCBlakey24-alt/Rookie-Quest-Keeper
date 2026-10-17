import { normaliseFog } from './fogOfWar';
import { fittedGrid, normaliseTactical } from './vttTacticalOverlay';

const PREFIX = 'rqk.vtt.encounters.v1.';
const MAX_PRESETS = 24;

export function encounterStorageKey(campaignId) {
  return PREFIX + encodeURIComponent(String(campaignId || 'unknown'));
}

export function normaliseTokenPositions(input) {
  const result = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  for (const [key, point] of Object.entries(input).slice(0, 100)) {
    const x = Number(point?.x), y = Number(point?.y);
    if (!key || key.length > 140 || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || x > 100 || y < 0 || y > 100) continue;
    result[key] = { x, y };
  }
  return result;
}

export function snapTokenPoint(x, y, columns, imageWidth, imageHeight, enabled) {
  const fitted = fittedGrid(columns, imageWidth, imageHeight);
  const col = fitted.columns;
  const rows = fitted.rows;
  const clamp = n => Math.min(99.5, Math.max(0.5, n));
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return { x: 50, y: 50 };
  if (!enabled) return { x: clamp(Number(x)), y: clamp(Number(y)) };
  return {
    x: clamp((Math.round(Number(x) * col / 100 - .5) + .5) * 100 / col),
    y: clamp((Math.round(Number(y) * rows / 100 - .5) + .5) * 100 / rows),
  };
}

export function normaliseManualTokens(raw) {
  return (Array.isArray(raw) ? raw : []).slice(0, 80).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const id=String(item.id || '').slice(0, 140);
    const name=String(item.name || '').trim().slice(0, 100);
    const x=Number(item.x), y=Number(item.y);
    if (!id.startsWith('gm-custom-') || !name || !Number.isFinite(x) || !Number.isFinite(y) || x<0 || x>100 || y<0 || y>100) return [];
    return [{ id, name, x, y, type:'enemy', visible:item.visible===true }];
  });
}

export function normaliseEncounter(input) {
  if (!input || typeof input !== 'object') return null;
  const id = String(input.id || '').slice(0, 100);
  const name = String(input.name || '').trim().slice(0, 100);
  if (!id || !name) return null;
  return {
    id, name,
    mapUrl: String(input.mapUrl || '').slice(0, 900000),
    sceneTitle: String(input.sceneTitle || '').slice(0, 160),
    sceneSubtitle: String(input.sceneSubtitle || '').slice(0, 320),
    scenarioId: String(input.scenarioId || '').slice(0, 140),
    visibleIds: (Array.isArray(input.visibleIds) ? input.visibleIds : []).slice(0, 100).map(id => String(id).slice(0, 140)),
    tokenPositions: normaliseTokenPositions(input.tokenPositions),
    manualTokens: normaliseManualTokens(input.manualTokens),
    round: Math.max(1, Math.min(5000, Math.round(Number(input.round) || 1))),
    activeId: String(input.activeId || '').slice(0, 140),
    fog: normaliseFog(input.fog),
    tactical: normaliseTactical(input.tactical),
    snap: input.snap === true,
  };
}

export function loadEncounterPresets(campaignId, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(encounterStorageKey(campaignId)) || '[]');
    return (Array.isArray(parsed) ? parsed : []).slice(0, MAX_PRESETS).map(normaliseEncounter).filter(Boolean);
  } catch { return []; }
}

export function saveEncounterPresets(campaignId, presets, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  if (!storage) throw Error('Local campaign storage unavailable');
  const safe = (Array.isArray(presets) ? presets : []).slice(0, MAX_PRESETS).map(normaliseEncounter).filter(Boolean);
  storage.setItem(encounterStorageKey(campaignId), JSON.stringify(safe));
  return safe;
}
