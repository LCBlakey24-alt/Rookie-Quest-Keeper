import { getOfflineCacheScope } from '@/offline/offlineApiCache';

const DB_NAME = 'rookie-quest-keeper-offline-sync';
const DB_VERSION = 1;
const STORE = 'operations';

function openDb() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('scope', 'scope');
        store.createIndex('queuedAt', 'queuedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function int(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function sortedConditions(value) {
  return Array.from(new Set(Array.isArray(value) ? value.filter(Boolean).map(String) : [])).sort();
}

function dispatchQueued() {
  try { window.dispatchEvent(new CustomEvent('rqk:offline-sync-queued')); } catch {}
}

export function combatStateSnapshot(source = {}) {
  const deathSaves = source.deathSaves || source.death_saves || {};
  return {
    current_hit_points: Math.max(0, int(source.current_hit_points ?? source.current_hp ?? source.hp, 0)),
    temporary_hit_points: Math.max(0, int(source.temporary_hit_points ?? source.temp_hp ?? source.tempHp, 0)),
    conditions: sortedConditions(source.conditions),
    death_saves_successes: Math.max(0, Math.min(3, int(source.death_saves_successes ?? deathSaves.successes, 0))),
    death_saves_failures: Math.max(0, Math.min(3, int(source.death_saves_failures ?? deathSaves.failures, 0))),
    concentrating_on: String(source.concentrating_on ?? source.concentration ?? ''),
  };
}

export function combatStatesMatch(a, b) {
  return JSON.stringify(combatStateSnapshot(a)) === JSON.stringify(combatStateSnapshot(b));
}

function operationKey(campaignId, characterId) {
  return `${getOfflineCacheScope()}::combat:${campaignId}:${characterId}`;
}

function closeOperationKey(campaignId) {
  return `${getOfflineCacheScope()}::combat-close:${campaignId}`;
}

async function readOperation(db, key) {
  return new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function putOperation(db, record) {
  await new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

async function listOperations(type) {
  const db = await openDb().catch(() => null);
  if (!db) return [];
  const scope = getOfflineCacheScope();
  const records = await new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result)
      ? request.result.filter(item => item.scope === scope && item.type === type)
      : []);
    request.onerror = () => resolve([]);
  });
  db.close();
  return records.sort((a, b) => Number(a.queuedAt || 0) - Number(b.queuedAt || 0));
}

async function updateOperation(key, updater) {
  const db = await openDb().catch(() => null);
  if (!db) return;
  await new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const request = store.get(key);
    request.onsuccess = () => {
      const current = request.result;
      if (current) store.put(updater(current));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
}

async function removeOperation(key) {
  if (!key) return;
  const db = await openDb().catch(() => null);
  if (!db) return;
  await new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
}

export async function queueOfflineCombatState({ campaignId, characterId, characterName, baseState, state }) {
  if (!campaignId || !characterId) return null;
  const db = await openDb().catch(() => null);
  if (!db) return null;
  const key = operationKey(campaignId, characterId);
  const existing = await readOperation(db, key);

  const record = {
    key,
    scope: getOfflineCacheScope(),
    type: 'character-combat-state',
    campaignId: String(campaignId),
    characterId: String(characterId),
    characterName: characterName || existing?.characterName || 'Character',
    // Preserve the first known cloud/base state if this character is changed
    // several times while offline; the final desired state can keep updating.
    baseState: existing?.baseState || combatStateSnapshot(baseState),
    state: combatStateSnapshot(state),
    queuedAt: existing?.queuedAt || Date.now(),
    updatedAt: Date.now(),
    status: 'pending',
    serverState: null,
    lastError: '',
  };

  await putOperation(db, record);
  db.close();
  dispatchQueued();
  return record;
}

export async function queueOfflineCombatClose({ campaignId, displayState } = {}) {
  if (!campaignId) return null;
  const db = await openDb().catch(() => null);
  if (!db) return null;
  const key = closeOperationKey(campaignId);
  const existing = await readOperation(db, key);
  const record = {
    key,
    scope: getOfflineCacheScope(),
    type: 'combat-close',
    campaignId: String(campaignId),
    displayState: displayState || existing?.displayState || {
      mode: 'blank',
      payload: { title: 'Combat ended', subtitle: 'Waiting for the GM' },
    },
    queuedAt: existing?.queuedAt || Date.now(),
    updatedAt: Date.now(),
    status: 'pending',
    lastError: '',
  };
  await putOperation(db, record);
  db.close();
  dispatchQueued();
  return record;
}

export async function listOfflineCombatSyncs() {
  return listOperations('character-combat-state');
}

export async function listOfflineCombatClosures() {
  return listOperations('combat-close');
}

export async function markOfflineCombatConflict(key, serverState, message = '') {
  await updateOperation(key, current => ({
    ...current,
    status: 'conflict',
    serverState: combatStateSnapshot(serverState),
    lastError: message,
    updatedAt: Date.now(),
  }));
}

export async function markOfflineCombatError(key, message = '') {
  await updateOperation(key, current => ({
    ...current,
    status: 'pending',
    lastError: String(message || ''),
    updatedAt: Date.now(),
  }));
}

export async function markOfflineCombatCloseError(key, message = '') {
  await updateOperation(key, current => ({
    ...current,
    status: 'pending',
    lastError: String(message || ''),
    updatedAt: Date.now(),
  }));
}

export async function removeOfflineCombatSync(key) {
  return removeOperation(key);
}

export async function removeOfflineCombatClose(key) {
  return removeOperation(key);
}
