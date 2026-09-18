import { AUTH_TOKEN_KEY, clearAuthToken, getAuthToken, isAuthTokenExpired, setAuthToken } from './auth';

function fakeJwt(exp) {
  const encode = (value) => window.btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'Keeper', exp })}.signature`;
}

describe('auth helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('migrates legacy token key to AUTH_TOKEN_KEY', () => {
    localStorage.setItem('token', 'legacy-token');

    expect(getAuthToken()).toBe('legacy-token');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('legacy-token');
  });

  test('setAuthToken stores primary token and clears legacy keys', () => {
    localStorage.setItem('token', 'old');
    localStorage.setItem('auth_token', 'old2');

    setAuthToken('new-token');

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('new-token');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  test('expired JWTs are discarded before protected routes can mount', () => {
    const expired = fakeJwt(Math.floor(Date.now() / 1000) - 60);
    localStorage.setItem(AUTH_TOKEN_KEY, expired);
    localStorage.setItem('dm_username', 'Keeper');

    expect(isAuthTokenExpired(expired)).toBe(true);
    expect(getAuthToken()).toBeNull();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem('dm_username')).toBeNull();
  });

  test('unexpired JWTs remain available for offline-capable sessions', () => {
    const current = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem(AUTH_TOKEN_KEY, current);

    expect(isAuthTokenExpired(current)).toBe(false);
    expect(getAuthToken()).toBe(current);
  });

  test('opaque legacy test tokens are left for the server to validate', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'current-token');
    expect(isAuthTokenExpired('current-token')).toBe(false);
    expect(getAuthToken()).toBe('current-token');
  });

  test('clearAuthToken clears primary and legacy keys', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'x');
    localStorage.setItem('token', 'y');
    localStorage.setItem('auth_token', 'z');

    clearAuthToken();

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
