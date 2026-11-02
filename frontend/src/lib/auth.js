import { isLocalPreview, PREVIEW_TOKEN } from '@/preview/previewMode';

export const AUTH_TOKEN_KEY = 'dm_token';
export const AUTH_USERNAME_KEY = 'dm_username';

const LEGACY_TOKEN_KEYS = ['token', 'auth_token'];

// Some browsers deny access to site storage entirely. Keep the current tab
// usable rather than crashing the public sign-in route. These in-memory values
// deliberately do not persist after a reload.
let inMemoryAuthToken = null;
let inMemoryAuthUsername = null;

function safeRead(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeWrite(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

export function getStoredAuthUsername() {
  return safeRead(AUTH_USERNAME_KEY) || inMemoryAuthUsername || '';
}

export function setStoredAuthUsername(username) {
  const value = String(username || '');
  inMemoryAuthUsername = safeWrite(AUTH_USERNAME_KEY, value) ? null : value;
}


function notifyAuthScopeChanged() {
  try { window.dispatchEvent(new CustomEvent('rqk:auth-scope-changed')); } catch {}
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isAuthTokenExpired(token, nowMs = Date.now()) {
  const payload = decodeJwtPayload(token);
  const expiresAtSeconds = Number(payload?.exp);
  if (!Number.isFinite(expiresAtSeconds)) return false;
  return expiresAtSeconds * 1000 <= nowMs;
}

export function getAuthToken() {
  if (isLocalPreview()) return PREVIEW_TOKEN;
  const primary = safeRead(AUTH_TOKEN_KEY);
  if (primary) {
    if (isAuthTokenExpired(primary)) {
      clearAuthToken();
      return null;
    }
    return primary;
  }

  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = safeRead(key);
    if (legacy) {
      if (isAuthTokenExpired(legacy)) {
        safeRemove(key);
        continue;
      }
      inMemoryAuthToken = safeWrite(AUTH_TOKEN_KEY, legacy) ? null : legacy;
      notifyAuthScopeChanged();
      return legacy;
    }
  }

  if (inMemoryAuthToken && isAuthTokenExpired(inMemoryAuthToken)) {
    clearAuthToken();
    return null;
  }
  return inMemoryAuthToken;
}

export function clearAuthToken() {
  if (isLocalPreview()) return;
  inMemoryAuthToken = null;
  inMemoryAuthUsername = null;
  safeRemove(AUTH_TOKEN_KEY);
  safeRemove(AUTH_USERNAME_KEY);
  for (const key of LEGACY_TOKEN_KEYS) safeRemove(key);
  notifyAuthScopeChanged();
}

export function setAuthToken(token) {
  if (isLocalPreview()) return;
  if (!token) {
    clearAuthToken();
    return;
  }
  inMemoryAuthToken = safeWrite(AUTH_TOKEN_KEY, token) ? null : token;
  for (const key of LEGACY_TOKEN_KEYS) safeRemove(key);
  notifyAuthScopeChanged();
}
