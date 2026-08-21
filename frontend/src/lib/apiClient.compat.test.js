import { applyLegacyApiCompatibility } from './apiClient';

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
