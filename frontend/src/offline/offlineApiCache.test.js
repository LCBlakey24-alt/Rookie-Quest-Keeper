import { getOfflineIdentityFromToken, isCacheableOfflineGet } from './offlineApiCache';

describe('offline API cache boundaries', () => {
  test('allows read-only campaign and character data', () => {
    expect(isCacheableOfflineGet({ method: 'get', url: '/campaigns/abc/quests' })).toBe(true);
    expect(isCacheableOfflineGet({ method: 'GET', url: '/characters' })).toBe(true);
    expect(isCacheableOfflineGet({ method: 'get', url: '/player/campaign/abc' })).toBe(true);
    expect(isCacheableOfflineGet({ method: 'get', url: '/campaign-invites/joined/list' })).toBe(true);
  });

  test('never treats mutations as offline-cacheable', () => {
    expect(isCacheableOfflineGet({ method: 'post', url: '/campaigns/abc/quests' })).toBe(false);
    expect(isCacheableOfflineGet({ method: 'put', url: '/campaigns/abc/quests/q1' })).toBe(false);
    expect(isCacheableOfflineGet({ method: 'patch', url: '/characters/c1' })).toBe(false);
    expect(isCacheableOfflineGet({ method: 'delete', url: '/campaigns/abc/quests/q1' })).toBe(false);
  });

  test('does not cache auth, admin or Rook AI responses', () => {
    expect(isCacheableOfflineGet({ method: 'get', url: '/auth/me' })).toBe(false);
    expect(isCacheableOfflineGet({ method: 'get', url: '/admin/metrics' })).toBe(false);
    expect(isCacheableOfflineGet({ method: 'get', url: '/rook/context' })).toBe(false);
  });

  test('allows useful rules/reference reads', () => {
    expect(isCacheableOfflineGet({ method: 'get', url: '/srd/spells' })).toBe(true);
    expect(isCacheableOfflineGet({ method: 'get', url: '/rule-systems' })).toBe(true);
    expect(isCacheableOfflineGet({ method: 'get', url: '/player-rules/abc' })).toBe(true);
  });

  test('derives a stable lowercase account identity from the JWT subject', () => {
    const encode = value => window.btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const tokenA = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'LewisBlakey', iat: 1, exp: 2 })}.signature-a`;
    const tokenB = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'LewisBlakey', iat: 100, exp: 200 })}.signature-b`;

    expect(getOfflineIdentityFromToken(tokenA)).toBe('lewisblakey');
    expect(getOfflineIdentityFromToken(tokenB)).toBe('lewisblakey');
    expect(getOfflineIdentityFromToken('not-a-jwt')).toBe('');
  });
});
