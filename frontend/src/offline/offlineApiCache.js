import { AUTH_USERNAME_KEY, getAuthToken } from '@/lib/auth';

const DB_NAME = 'rookie-quest-keeper-offline';
const DB_VERSION = 1;
const STORE_NAME = 'api-responses';

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

function currentScope() {
  try {
    const username = localStorage.getItem(AUTH_USERNAME_KEY);
    if (username) return `user:${username.toLowerCase()}`;
    const token = getAuthToken();
    if (!token) return 'anonymous';

    // Small one-way-ish local fingerprint so a missing username does not make
    // two signed-in accounts share the same cache namespace on one device.
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

function cacheKey(config = {}) {
  return `${currentScope()}::${normaliseUrl(config)}::${stableParams(config.params)}`;
}

function openDb() {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('savedAt', 'savedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeOfflineApiResponse(config, response) {
  if (!isCacheableOfflineGet(config) || !response || response.status < 200 || response.status >= 300) return;
  const db = await openDb().catch(() => null);
  if (!db) return;

  const record = {
    key: cacheKey(config),
    path: normaliseUrl(config),
    scope: currentScope(),
    data: response.data,
    status: response.status,
    savedAt: Date.now(),
  };

  await new Promise(resolve => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
}

export async function readOfflineApiResponse(config) {
  if (!isCacheableOfflineGet(config)) return null;
  const db = await openDb().catch(() => null);
  if (!db) return null;

  const record = await new Promise(resolve => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(cacheKey(config));
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

export async function clearOfflineApiCache() {
  const db = await openDb().catch(() => null);
  if (!db) return;
  await new Promise(resolve => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  db.close();
}
