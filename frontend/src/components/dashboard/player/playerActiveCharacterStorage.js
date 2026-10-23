import { AUTH_USERNAME_KEY } from '@/lib/auth';

const PREFIX = 'rqk.player.active-character';

function storageKey() {
  try {
    const username = String(localStorage.getItem(AUTH_USERNAME_KEY) || '').trim().toLowerCase();
    // Never share selected character IDs across different logins on one device.
    return username ? `${PREFIX}:${encodeURIComponent(username)}` : null;
  } catch {
    return null;
  }
}

export function readActiveCharacterId() {
  try {
    const key = storageKey();
    return key ? localStorage.getItem(key) || '' : '';
  } catch {
    return '';
  }
}

export function storeActiveCharacterId(characterId) {
  try {
    const key = storageKey();
    if (!key) return;
    if (characterId) localStorage.setItem(key, String(characterId));
    else localStorage.removeItem(key);
  } catch {
    // Private browsing can block storage. Current in-memory selection still works.
  }
}
