import { isDetailRoute } from './detailRoutes';

describe('which pages get the compact rail', () => {
  test.each([
    ['/campaign/1f93fb58-4cab-4b85-9efe-1987f84f5d11', 'one campaign'],
    ['/campaign/abc/live', 'live play'],
    ['/characters/char-1', 'a character sheet'],
    ['/characters/char-1/edit', 'editing a character'],
    ['/combat/camp-1', 'combat'],
    ['/gm-screen/camp-1', 'the GM screen'],
    ['/homebrew', 'the homebrew workshop'],
  ])('%s is a working surface (%s)', (path) => {
    expect(isDetailRoute(path)).toBe(true);
  });

  test.each([
    ['/', 'the root'],
    ['/home', 'the dashboard'],
    ['/characters', 'the character list'],
    ['/campaigns', 'the campaign list'],
    ['/settings', 'settings'],
    ['/uploads', 'uploads'],
    ['/admin', 'admin'],
  ])('%s keeps the labelled rail (%s)', (path) => {
    expect(isDetailRoute(path)).toBe(false);
  });

  test('a list page is not compacted by a trailing slash', () => {
    // /characters/ is still the list, not a sheet.
    expect(isDetailRoute('/characters/')).toBe(false);
    expect(isDetailRoute('/campaigns/')).toBe(false);
  });

  test('a query string or hash does not change the answer', () => {
    // The campaign page uses a hash for its tabs.
    expect(isDetailRoute('/campaign/abc#tab-npcs')).toBe(true);
    expect(isDetailRoute('/characters?sort=name')).toBe(false);
  });

  test('a lookalike path does not match', () => {
    expect(isDetailRoute('/charactersomething/x')).toBe(false);
    expect(isDetailRoute('/campaignish/x')).toBe(false);
  });

  test('nothing sensible is required of it', () => {
    [undefined, null, '', 123].forEach((value) => {
      expect(isDetailRoute(value)).toBe(false);
    });
  });
});
