import { applyLegacyApiCompatibility, applyLoginTimeoutPolicy, wakeBackend } from './apiClient';

describe('legacy account API compatibility', () => {
  test.each([
    ['get', '/account/profile', 'get', '/auth/me'],
    ['put', '/account/update', 'patch', '/auth/me'],
    ['post', '/account/change-password', 'post', '/auth/change-password'],
    ['delete', '/account/delete', 'delete', '/auth/me'],
  ])('%s %s maps to %s %s', (method, url, expectedMethod, expectedUrl) => {
    const mapped = applyLegacyApiCompatibility({ method, url, headers: {} });
    expect(mapped.method).toBe(expectedMethod);
    expect(mapped.url).toBe(expectedUrl);
  });

  test('leaves current routes unchanged', () => {
    const original = { method: 'get', url: '/campaigns/c1', headers: {} };
    expect(applyLegacyApiCompatibility(original)).toBe(original);
  });
});

describe('login timeout policy', () => {
  test('disables the client timeout for login so a sleeping backend can wake up', () => {
    const configured = applyLoginTimeoutPolicy({ method: 'post', url: '/auth/login', timeout: 20000 });
    expect(configured.timeout).toBe(0);
  });

  test('keeps the normal timeout policy for other requests', () => {
    const original = { method: 'get', url: '/campaigns', timeout: 20000 };
    expect(applyLoginTimeoutPolicy(original)).toBe(original);
  });
});

describe('backend wake-up', () => {
  test('pings the health endpoint without surfacing a failure', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await expect(wakeBackend()).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/health$/),
      expect.objectContaining({ method: 'GET', cache: 'no-store' })
    );

    global.fetch = originalFetch;
  });
});
