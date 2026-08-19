import { isCacheableOfflineGet } from './offlineApiCache';

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
});
