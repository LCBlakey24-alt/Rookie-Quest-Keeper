export const AUTH_TOKEN_KEY = 'dm_token';
export const AUTH_USERNAME_KEY = 'dm_username';

const LEGACY_TOKEN_KEYS = ['token', 'auth_token'];

function notifyAuthScopeChanged() {
  try { window.dispatchEvent(new CustomEvent('rqk:auth-scope-changed')); } catch {}
}

export function getAuthToken() {
  const primary = localStorage.getItem(AUTH_TOKEN_KEY);
  if (primary) return primary;

  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      localStorage.setItem(AUTH_TOKEN_KEY, legacy);
      notifyAuthScopeChanged();
      return legacy;
    }
  }

  return null;
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USERNAME_KEY);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
  notifyAuthScopeChanged();
}

export function setAuthToken(token) {
  if (!token) {
    clearAuthToken();
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
  notifyAuthScopeChanged();
}
