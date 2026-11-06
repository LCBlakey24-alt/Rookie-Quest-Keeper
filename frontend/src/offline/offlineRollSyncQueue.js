import { getOfflineCacheScope } from '@/offline/offlineApiCache';

const STORAGE_PREFIX = 'rqk.rollSync.v1.';

function storage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const part = value => encodeURIComponent(String(value || ''));

function scopePrefix(scope) {
  return `${STORAGE_PREFIX}${part(scope)}.`;
}

function recordKey(scope, campaignId, eventId) {
  return `${scopePrefix(scope)}${part(campaignId)}.${part(eventId)}`;
}

function readRecord(store, key) {
  try {
    const value = JSON.parse(store.getItem(key) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Persist one exact client event before delivery starts. The server's
 * client_event_id idempotency means replaying this record can acknowledge a
 * response that was lost without ever counting the roll twice.
 */
export function queuePendingRoll({ scope = getOfflineCacheScope(), campaignId, event } = {}) {
  const store = storage();
  const eventId = event?.client_event_id || event?.id;
  if (!store || !scope || !campaignId || !eventId || !event) return null;

  const key = recordKey(scope, campaignId, eventId);
  const existing = readRecord(store, key);
  const record = {
    key,
    scope: String(scope),
    campaignId: String(campaignId),
    event: { ...event, id: eventId, client_event_id: eventId },
    queuedAt: existing?.queuedAt || Date.now(),
    updatedAt: Date.now(),
  };

  try {
    store.setItem(key, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

/** Only records owned by the current (or explicitly supplied) account. */
export function listPendingRolls(scope = getOfflineCacheScope()) {
  const store = storage();
  if (!store || !scope) return [];
  const prefix = scopePrefix(scope);
  const records = [];

  try {
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      const record = readRecord(store, key);
      if (record?.scope === scope && record?.campaignId && record?.event?.client_event_id) {
        records.push(record);
      }
    }
  } catch {
    return [];
  }

  return records.sort((left, right) => Number(left.queuedAt || 0) - Number(right.queuedAt || 0));
}

export function removePendingRoll(key) {
  const store = storage();
  if (!store || !String(key || '').startsWith(STORAGE_PREFIX)) return;
  try { store.removeItem(key); } catch { /* best effort */ }
}
