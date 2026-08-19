import { AUTH_USERNAME_KEY, getAuthToken } from '@/lib/auth';

const DB_NAME = 'rookie-quest-keeper-offline';
const DB_VERSION = 2;
const RESPONSE_STORE = 'api-responses';
const PACK_STORE = 'campaign-packs';

const CACHEABLE_PREFIXES = [
  '/campaigns',
  '/characters',
  '/player/',
  '/srd',
  '/rule-systems',
  '/progression',
  '/user-content',
  '/player-rules',
];

const CACHEABLE_EXACT = new Set([
  '/campaign-invites/joined/list',
]);

function isIndexedDbAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

export function getOfflineCacheScope() {
  try {
    const username = localStorage.getItem(AUTH_USERNAME_KEY);
    if (username) return `user:${username.toLowerCase()}`;
    const token = getAuthToken();
    if (!token) return 'anonymous';

    // Small local fingerprint so a missing username does not make two signed-in
    // accounts share the same cache namespace on one device. The token itself
    // is never written into IndexedDB.
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `token:${(hash >>> 0).toString(36)}`;
  } catch {
    return 'unknown';
  }
}

function normaliseUrl(config = {}) {
  const url = String(config.url || '');
  if (!url) return '';
  try {
    const parsed = new URL(url, config.baseURL || window.location.origin);
    return parsed.pathname;
  } catch {
    return url.split('?')[0];
  }
}

export function isCacheableOfflineGet(config = {}) {
  if (String(config.method || 'get').toLowerCase() !== 'get') return false;
  const path = normaliseUrl(config);
  if (!path || path === '/auth/me' || path.startsWith('/auth/') || path.startsWith('/admin') || path.startsWith('/rook')) return false;
  return CACHEABLE_EXACT.has(path) || CACHEABLE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

function stableParams(params) {
  if (!params || typeof params !== 'object') return '';
  return JSON.stringify(Object.keys(params).sort().reduce((result, key) => {
    result[key] = params[key];
    return result;
  }, {}));
}

export function getOfflineCacheKey(config = {}) {
  return `${getOfflineCacheScope()}::${normaliseUrl(config)}::${stableParams(config.params)}`;
}

function campaignPackKey(campaignId) {
  return `${getOfflineCacheScope()}::campaign:${campaignId}`;
}

function openDb() {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RESPONSE_STORE)) {
        const store = db.createObjectStore(RESPONSE_STORE, { keyPath: 'key' });
        store.createIndex('savedAt', 'savedAt');
        store.createIndex('scope', 'scope');
      } else {
        const store = request.transaction.objectStore(RESPONSE_STORE);
        if (!store.indexNames.contains('savedAt')) store.createIndex('savedAt', 'savedAt');
        if (!store.indexNames.contains('scope')) store.createIndex('scope', 'scope');
      }
      if (!db.objectStoreNames.contains(PACK_STORE)) {
        const packStore = db.createObjectStore(PACK_STORE, { keyPath: 'key' });
        packStore.createIndex('scope', 'scope');
        packStore.createIndex('campaignId', 'campaignId');
        packStore.createIndex('savedAt', 'savedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeOfflineApiResponse(config, response) {
  if (!isCacheableOfflineGet(config) || !response || response.status < 200 || response.status >= 300) return '';
  const db = await openDb().catch(() => null);
  if (!db) return '';

  const key = getOfflineCacheKey(config);
  const record = {
    key,
    path: normaliseUrl(config),
    params: stableParams(config.params),
    scope: getOfflineCacheScope(),
    data: response.data,
    status: response.status,
    savedAt: Date.now(),
  };

  await new Promise(resolve => {
    const transaction = db.transaction(RESPONSE_STORE, 'readwrite');
    transaction.objectStore(RESPONSE_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
  return key;
}

export async function readOfflineApiResponse(config) {
  if (!isCacheableOfflineGet(config)) return null;
  const db = await openDb().catch(() => null);
  if (!db) return null;

  const record = await new Promise(resolve => {
    const transaction = db.transaction(RESPONSE_STORE, 'readonly');
    const request = transaction.objectStore(RESPONSE_STORE).get(getOfflineCacheKey(config));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
  db.close();

  if (!record) return null;
  return {
    data: record.data,
    status: 200,
    statusText: 'Offline Cache',
    headers: {
      'x-rqk-offline-cache': '1',
      'x-rqk-offline-saved-at': String(record.savedAt || ''),
    },
    config,
    rqkOffline: true,
    rqkOfflineSavedAt: record.savedAt || 0,
  };
}

export async function saveOfflineCampaignPackMetadata(pack = {}) {
  if (!pack.campaignId) return null;
  const db = await openDb().catch(() => null);
  if (!db) return null;

  const record = {
    ...pack,
    key: campaignPackKey(pack.campaignId),
    scope: getOfflineCacheScope(),
    campaignId: String(pack.campaignId),
    savedAt: Number(pack.savedAt || Date.now()),
    recordKeys: Array.from(new Set(Array.isArray(pack.recordKeys) ? pack.recordKeys.filter(Boolean) : [])),
  };

  await new Promise(resolve => {
    const transaction = db.transaction(PACK_STORE, 'readwrite');
    transaction.objectStore(PACK_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
  return record;
}

export async function getOfflineCampaignPackMetadata(campaignId) {
  if (!campaignId) return null;
  const db = await openDb().catch(() => null);
  if (!db) return null;

  const record = await new Promise(resolve => {
    const transaction = db.transaction(PACK_STORE, 'readonly');
    const request = transaction.objectStore(PACK_STORE).get(campaignPackKey(campaignId));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
  db.close();
  return record;
}

export async function listOfflineCampaignPacks() {
  const db = await openDb().catch(() => null);
  if (!db) return [];
  const scope = getOfflineCacheScope();
  const records = await new Promise(resolve => {
    const transaction = db.transaction(PACK_STORE, 'readonly');
    const request = transaction.objectStore(PACK_STORE).getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result.filter(item => item.scope === scope) : []);
    request.onerror = () => resolve([]);
  });
  db.close();
  return records.sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
}

export async function removeOfflineCampaignPack(campaignId) {
  if (!campaignId) return;
  const current = await getOfflineCampaignPackMetadata(campaignId);
  if (!current) return;

  const allPacks = await listOfflineCampaignPacks();
  const protectedKeys = new Set(
    allPacks
      .filter(pack => String(pack.campaignId) !== String(campaignId))
      .flatMap(pack => Array.isArray(pack.recordKeys) ? pack.recordKeys : [])
      .filter(Boolean)
  );
  const removableKeys = (current.recordKeys || []).filter(key => !protectedKeys.has(key));

  const db = await openDb().catch(() => null);
  if (!db) return;
  await new Promise(resolve => {
    const transaction = db.transaction([RESPONSE_STORE, PACK_STORE], 'readwrite');
    const responseStore = transaction.objectStore(RESPONSE_STORE);
    removableKeys.forEach(key => responseStore.delete(key));
    transaction.objectStore(PACK_STORE).delete(campaignPackKey(campaignId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
}

export async function clearOfflineApiCache() {
  const db = await openDb().catch(() => null);
  if (!db) return;
  await new Promise(resolve => {
    const stores = db.objectStoreNames.contains(PACK_STORE) ? [RESPONSE_STORE, PACK_STORE] : [RESPONSE_STORE];
    const transaction = db.transaction(stores, 'readwrite');
    transaction.objectStore(RESPONSE_STORE).clear();
    if (stores.includes(PACK_STORE)) transaction.objectStore(PACK_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
}
