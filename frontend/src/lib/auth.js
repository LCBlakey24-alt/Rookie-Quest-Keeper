export const AUTH_TOKEN_KEY = 'dm_token';
export const AUTH_USERNAME_KEY = 'dm_username';

const LEGACY_TOKEN_KEYS = ['token', 'auth_token'];

export function getAuthToken() {
  const primary = localStorage.getItem(AUTH_TOKEN_KEY);
  if (primary) return primary;

  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      localStorage.setItem(AUTH_TOKEN_KEY, legacy);
      return legacy;
    }
  }

  return null;
}

export function setAuthToken(token) {
  if (!token) return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}
