import { isLocalPreview, PREVIEW_TOKEN } from '@/preview/previewMode';

export const AUTH_TOKEN_KEY = 'dm_token';
export const AUTH_USERNAME_KEY = 'dm_username';

const LEGACY_TOKEN_KEYS = ['token', 'auth_token'];

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
  const primary = localStorage.getItem(AUTH_TOKEN_KEY);
  if (primary) {
    if (isAuthTokenExpired(primary)) {
      clearAuthToken();
      return null;
    }
    return primary;
  }

  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      if (isAuthTokenExpired(legacy)) {
        localStorage.removeItem(key);
        continue;
      }
      localStorage.setItem(AUTH_TOKEN_KEY, legacy);
      notifyAuthScopeChanged();
      return legacy;
    }
  }

  return null;
}

export function clearAuthToken() {
  if (isLocalPreview()) return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USERNAME_KEY);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
  notifyAuthScopeChanged();
}

export function setAuthToken(token) {
  if (isLocalPreview()) return;
  if (!token) {
    clearAuthToken();
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
  notifyAuthScopeChanged();
}
