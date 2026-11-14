import { getOfflineCacheScope } from '@/offline/offlineApiCache';

const DB_NAME = 'rookie-quest-keeper-offline-sync';
const DB_VERSION = 1;
const STORE = 'operations';
const READ_FAILED = Symbol('read failed');

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

function operationKey(scope, campaignId, characterId) {
  return `${scope}::combat:${campaignId}:${characterId}`;
}

function closeOperationKey(scope, campaignId) {
  return `${scope}::combat-close:${campaignId}`;
}

function lootOperationKey(scope, campaignId, operationId) {
  return `${scope}::combat-loot:${campaignId}:${operationId}`;
}

async function readOperation(db, key) {
  return new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(READ_FAILED);
  });
}

async function putOperation(db, record) {
  return new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
}

async function putOperationsAtomically(db, records) {
  return new Promise(resolve => {
    let successful = true;
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    records.forEach(record => store.put(record));
    transaction.oncomplete = () => resolve(successful);
    transaction.onerror = () => { successful = false; };
    transaction.onabort = () => resolve(false);
  });
}

async function listOperations(type) {
  const scope = getOfflineCacheScope();
  const db = await openDb().catch(() => null);
  if (!db) return [];
  if (scope !== getOfflineCacheScope()) {
    db.close();
    return [];
  }
  const records = await new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result)
      ? request.result.filter(item => item.scope === scope && item.type === type)
      : []);
    request.onerror = () => resolve([]);
  });
  db.close();
  if (scope !== getOfflineCacheScope()) return [];
  return records.sort((a, b) => Number(a.queuedAt || 0) - Number(b.queuedAt || 0));
}

// A sync request may finish after a later offline edit replaced its record.
// Only mutate the exact version that was sent to the server.
function isExpectedRecord(current, expected) {
  return !expected || JSON.stringify(current) === JSON.stringify(expected);
}

async function updateOperation(key, updater, expected) {
  const db = await openDb().catch(() => null);
  if (!db) return;
  await new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const request = store.get(key);
    request.onsuccess = () => {
      const current = request.result;
      if (current && isExpectedRecord(current, expected)) store.put(updater(current));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
}

async function removeOperation(key, expected) {
  if (!key) return;
  const db = await openDb().catch(() => null);
  if (!db) return;
  await new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    if (expected) {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && isExpectedRecord(request.result, expected)) store.delete(key);
      };
    } else {
      store.delete(key);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
}

function buildCombatStateRecord({ scope, campaignId, characterId, characterName, baseState, state, existing }) {
  return {
    key: operationKey(scope, campaignId, characterId),
    scope,
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
}

function buildCloseRecord({ scope, campaignId, displayState, existing }) {
  return {
    key: closeOperationKey(scope, campaignId),
    scope,
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
}

function buildLootRecord({ scope, campaignId, operationId, item, itemName, existing }) {
  return {
    key: lootOperationKey(scope, campaignId, operationId),
    scope,
    type: 'combat-loot-create',
    campaignId: String(campaignId),
    operationId: String(operationId),
    item: item && typeof item === 'object' ? item : {},
    itemName: itemName || item?.name || existing?.itemName || 'Combat loot',
    queuedAt: existing?.queuedAt || Date.now(),
    updatedAt: Date.now(),
    status: 'pending',
    lastError: '',
  };
}

export async function queueOfflineCombatState({ campaignId, characterId, characterName, baseState, state }) {
  if (!campaignId || !characterId) return null;
  const scope = getOfflineCacheScope();
  const db = await openDb().catch(() => null);
  if (!db) return null;
  const key = operationKey(scope, campaignId, characterId);
  const existing = await readOperation(db, key);
  if (existing === READ_FAILED) { db.close(); return null; }
  const record = buildCombatStateRecord({
    scope, campaignId, characterId, characterName, baseState, state, existing,
  });
  const successful = scope === getOfflineCacheScope() && await putOperation(db, record);
  db.close();
  if (!successful) return null;
  dispatchQueued();
  return record;
}

export async function queueOfflineCombatClose({ campaignId, displayState } = {}) {
  if (!campaignId) return null;
  const scope = getOfflineCacheScope();
  const db = await openDb().catch(() => null);
  if (!db) return null;
  const key = closeOperationKey(scope, campaignId);
  const existing = await readOperation(db, key);
  if (existing === READ_FAILED) { db.close(); return null; }
  const record = buildCloseRecord({ scope, campaignId, displayState, existing });
  const successful = scope === getOfflineCacheScope() && await putOperation(db, record);
  db.close();
  if (!successful) return null;
  dispatchQueued();
  return record;
}

export async function queueOfflineCombatEnd({ campaignId, characters = [], loot = [], displayState } = {}) {
  if (!campaignId) return null;
  const scope = getOfflineCacheScope();
  const safeCharacters = Array.isArray(characters)
    ? characters.filter(item => item?.characterId && item?.baseState && item?.state)
    : [];
  const safeLoot = Array.isArray(loot)
    ? loot.filter(item => item?.operationId && item?.item && typeof item.item === 'object')
    : [];
  const db = await openDb().catch(() => null);
  if (!db) return null;
  const characterRecords = [];
  for (const item of safeCharacters) {
    const key = operationKey(scope, campaignId, item.characterId);
    const existing = await readOperation(db, key);
    if (existing === READ_FAILED) { db.close(); return null; }
    characterRecords.push(buildCombatStateRecord({
      scope,
      campaignId,
      characterId: item.characterId,
      characterName: item.characterName,
      baseState: item.baseState,
      state: item.state,
      existing,
    }));
  }

  const lootRecords = [];
  for (const item of safeLoot) {
    const key = lootOperationKey(scope, campaignId, item.operationId);
    const existing = await readOperation(db, key);
    if (existing === READ_FAILED) { db.close(); return null; }
    lootRecords.push(buildLootRecord({
      scope,
      campaignId,
      operationId: item.operationId,
      item: item.item,
      itemName: item.itemName,
      existing,
    }));
  }

  const closeKey = closeOperationKey(scope, campaignId);
  const existingClose = await readOperation(db, closeKey);
  if (existingClose === READ_FAILED) { db.close(); return null; }
  const closeRecord = buildCloseRecord({ scope, campaignId, displayState, existing: existingClose });
  const successful = scope === getOfflineCacheScope()
    && await putOperationsAtomically(db, [...characterRecords, ...lootRecords, closeRecord]);
  db.close();
  if (!successful) return null;
  dispatchQueued();
  return { characterRecords, lootRecords, closeRecord };
}

export async function listOfflineCombatSyncs() {
  return listOperations('character-combat-state');
}

export async function listOfflineCombatClosures() {
  return listOperations('combat-close');
}

export async function listOfflineCombatLootSyncs() {
  return listOperations('combat-loot-create');
}

export async function markOfflineCombatConflict(key, serverState, message = '', expected) {
  await updateOperation(key, current => ({
    ...current,
    status: 'conflict',
    serverState: combatStateSnapshot(serverState),
    lastError: message,
    updatedAt: Date.now(),
  }), expected);
}

export async function markOfflineCombatError(key, message = '', expected) {
  await updateOperation(key, current => ({
    ...current,
    status: 'pending',
    lastError: String(message || ''),
    updatedAt: Date.now(),
  }), expected);
}

export async function markOfflineCombatCloseError(key, message = '', expected) {
  await updateOperation(key, current => ({
    ...current,
    status: 'pending',
    lastError: String(message || ''),
    updatedAt: Date.now(),
  }), expected);
}

export async function markOfflineCombatLootError(key, message = '', expected) {
  await updateOperation(key, current => ({
    ...current,
    status: 'pending',
    lastError: String(message || ''),
    updatedAt: Date.now(),
  }), expected);
}

export async function removeOfflineCombatSync(key, expected) {
  return removeOperation(key, expected);
}

export async function removeOfflineCombatClose(key, expected) {
  return removeOperation(key, expected);
}

export async function removeOfflineCombatLootSync(key, expected) {
  return removeOperation(key, expected);
}
