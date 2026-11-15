import { cacheOfflineMediaUrls, extractOfflineMediaUrls, getOfflineMediaCacheName } from './offlineMediaCache';
import { AUTH_USERNAME_KEY } from '@/lib/auth';

describe('offline campaign media cache', () => {
  test('discovers map, handout, portrait and attachment media recursively', () => {
    const urls = extractOfflineMediaUrls({
      map_url: '/uploads/maps/castle.webp',
      npcs: [{ portrait_url: 'https://cdn.example.com/npc.png' }],
      handout: { attachment_url: '/uploads/clue.pdf' },
      nested: { ignored_link: 'https://example.com/not-media-page' },
    });

    expect(urls).toContain(`${window.location.origin}/uploads/maps/castle.webp`);
    expect(urls).toContain('https://cdn.example.com/npc.png');
    expect(urls).toContain(`${window.location.origin}/uploads/clue.pdf`);
    expect(urls).not.toContain('https://example.com/not-media-page');
  });

  test('ignores data/blob values that should not become persistent cache requests', () => {
    const urls = extractOfflineMediaUrls({
      image_url: 'data:image/png;base64,AAAA',
      portrait_url: 'blob:https://example.com/temporary',
    });
    expect(urls).toEqual([]);
  });

  test('uses different media cache names for different accounts', () => {
    const lewis = getOfflineMediaCacheName('user:lewis');
    const player = getOfflineMediaCacheName('user:player');
    expect(lewis).toMatch(/^rqk-media-v1-[a-z0-9]+$/);
    expect(player).toMatch(/^rqk-media-v1-[a-z0-9]+$/);
    expect(lewis).not.toBe(player);
    expect(getOfflineMediaCacheName('anonymous')).toBe('');
  });

  test('does not write a response after the signed-in account changes', async () => {
    const previousCaches = global.caches;
    const previousFetch = global.fetch;
    const previousRequest = global.Request;
    const put = jest.fn();
    localStorage.setItem(AUTH_USERNAME_KEY, 'gm');
    global.caches = { open: jest.fn(async () => ({ put })) };
    global.Request = jest.fn((url) => ({ url }));
    global.fetch = jest.fn(async () => {
      localStorage.setItem(AUTH_USERNAME_KEY, 'player');
      return { ok: true, clone() { return this; } };
    });
    try {
      await expect(cacheOfflineMediaUrls(['/uploads/map.png'], { expectedScope: 'user:gm' })).rejects.toThrow('account changed');
      expect(put).not.toHaveBeenCalled();
    } finally {
      global.caches = previousCaches;
      global.fetch = previousFetch;
      global.Request = previousRequest;
      localStorage.clear();
    }
  });

  test('reports files unavailable when this browser has no Cache Storage', async () => {
    const previousCaches = global.caches;
    global.caches = undefined;
    try {
      const result = await cacheOfflineMediaUrls(['/uploads/map.png']);
      expect(result.saved).toEqual([]);
      expect(result.failed).toEqual([`${window.location.origin}/uploads/map.png`]);
    } finally {
      global.caches = previousCaches;
    }
  });
});
