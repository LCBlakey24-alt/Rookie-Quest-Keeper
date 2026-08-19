import { extractOfflineMediaUrls, getOfflineMediaCacheName } from './offlineMediaCache';

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
});
