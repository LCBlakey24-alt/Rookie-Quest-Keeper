import {
  getOfflineCacheKey, storeOfflineApiResponse, readOfflineApiResponse,
} from './offlineApiCache';
import { AUTH_TOKEN_KEY, AUTH_USERNAME_KEY } from '@/lib/auth';
import apiClient from '@/lib/apiClient';

const token = (subject, version = 1) => {
  const encode = value => window.btoa(JSON.stringify(value)).replace(/=/g, '').replaceAll('+', '-').replaceAll('/', '_');
  return `${encode({ alg: 'HS256' })}.${encode({ sub: subject, v: version })}.signature`;
};
const config = (auth, url = '/characters') => ({ method: 'get', url, headers: { Authorization: `Bearer ${auth}` } });

describe('request-bound offline cache account and query', () => {
  beforeEach(() => { localStorage.clear(); });

  test('a completed request from A never acquires B scope after account switch', () => {
    const a = token('account-a');
    const b = token('account-b');
    localStorage.setItem(AUTH_TOKEN_KEY, a);
    const issued = config(a);
    const first = getOfflineCacheKey(issued);
    localStorage.setItem(AUTH_TOKEN_KEY, b);
    expect(getOfflineCacheKey(issued)).toBe(first);
    expect(first).toMatch(/^user:account-a::/);
    expect(getOfflineCacheKey(config(b))).toMatch(/^user:account-b::/);
  });

  test('token renewal for the SAME account preserves its scope', () => {
    const a = token('account-a');
    const newer = token('account-a', 2);
    localStorage.setItem(AUTH_TOKEN_KEY, newer);
    expect(getOfflineCacheKey(config(a))).toBe(getOfflineCacheKey(config(newer)));
  });

  test('distinct inline and config query filters never collide', () => {
    const auth = token('account-a');
    const a = config(auth, '/srd/spells?level=1');
    const b = config(auth, '/srd/spells?level=9');
    expect(getOfflineCacheKey(a)).not.toBe(getOfflineCacheKey(b));
    expect(getOfflineCacheKey(config(auth, '/srd/spells?b=2&a=1')))
      .toBe(getOfflineCacheKey(config(auth, '/srd/spells?a=1&b=2')));
    expect(getOfflineCacheKey({ ...a, params: { school: 'abjuration' } }))
      .not.toBe(getOfflineCacheKey(a));
    expect(getOfflineCacheKey(config(auth, '/srd/spells?tag=fire&tag=ice')))
      .not.toBe(getOfflineCacheKey(config(auth, '/srd/spells?tag=fire')));
    expect(getOfflineCacheKey(config(auth, '/srd/spells?tag=ice&tag=fire')))
      .toBe(getOfflineCacheKey(config(auth, '/srd/spells?tag=fire&tag=ice')));
  });

  test('URL and config params combine, with equivalent order the same', () => {
    const auth = token('account-a');
    const first = { ...config(auth, '/srd/spells?level=3'), params: { school: 'evocation', tag: ['fire', 'light'] } };
    const second = { ...config(auth, '/srd/spells?level=3&school=evocation'), params: { tag: ['light', 'fire'] } };
    expect(getOfflineCacheKey(first)).toBe(getOfflineCacheKey(second));
  });

  test('old request cannot write when logout occurs before IndexedDB opens', async () => {
    const a = token('account-a');
    localStorage.setItem(AUTH_TOKEN_KEY, a);
    let openRequest;
    let transactions = 0;
    const previous = Object.getOwnPropertyDescriptor(window, 'indexedDB');
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: { open: () => {
      openRequest = { result: { transaction: () => { transactions += 1; return {}; }, close: () => {} } };
      return openRequest;
    } } });
    try {
      const saving = storeOfflineApiResponse(config(a), { status: 200, data: [{ id: 'secret-A' }] });
      await Promise.resolve();
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USERNAME_KEY);
      openRequest.onsuccess();
      await saving;
      expect(transactions).toBe(0);
    } finally { if (previous) Object.defineProperty(window, 'indexedDB', previous); else delete window.indexedDB; }
  });

  test('old request cannot read another account after IndexedDB open', async () => {
    const a = token('account-a');
    const b = token('account-b');
    localStorage.setItem(AUTH_TOKEN_KEY, a);
    let openRequest;
    let transactions = 0;
    const previous = Object.getOwnPropertyDescriptor(window, 'indexedDB');
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: { open: () => {
      openRequest = { result: { transaction: () => { transactions += 1; return {}; }, close: () => {} } };
      return openRequest;
    } } });
    try {
      const reading = readOfflineApiResponse(config(a));
      await Promise.resolve();
      localStorage.setItem(AUTH_TOKEN_KEY, b);
      openRequest.onsuccess();
      expect(await reading).toBeNull();
      expect(transactions).toBe(0);
    } finally { if (previous) Object.defineProperty(window, 'indexedDB', previous); else delete window.indexedDB; }
  });
});

test('real intercepted GET keeps account A authorization and cache scope after delayed response during switch to B', async () => {
  const a = token('account-a');
  const b = token('account-b');
  localStorage.setItem(AUTH_TOKEN_KEY, a);
  let respond;
  let entered;
  const adapterEntered = new Promise(resolve => { entered = resolve; });
  const request = apiClient.get('/characters', {
    adapter: issuedConfig => new Promise(resolve => {
      respond = () => resolve({
        config: issuedConfig, status: 200, statusText: 'OK', headers: {}, data: [{ id: 'character-a' }],
      });
      entered(issuedConfig);
    }),
  });
  const captured = await adapterEntered;
  expect(captured.headers.Authorization).toBe(`Bearer ${a}`);
  expect(captured.rqkOfflineRequestAuthorization).toBe(`Bearer ${a}`);
  localStorage.setItem(AUTH_TOKEN_KEY, b);
  respond();
  const response = await request;
  expect(getOfflineCacheKey(response.config)).toMatch(/^user:account-a::/);
  expect(getOfflineCacheKey(config(b))).toMatch(/^user:account-b::/);
  // The completed request must not be written under B as the deferred cache
  // interceptor starts, even if it resolves asynchronously after logout/switch.
  expect(response.config.rqkOfflineRequestAuthorization).toBe(`Bearer ${a}`);
});

test('anonymous request marker never inherits a user who logs in during its response', () => {
  const issued = { method: 'get', url: '/srd/spells', rqkOfflineRequestAuthorization: '' };
  const before = getOfflineCacheKey(issued);
  localStorage.setItem(AUTH_TOKEN_KEY, token('account-b'));
  expect(getOfflineCacheKey(issued)).toBe(before);
  expect(before).toMatch(/^anonymous::/);
});
