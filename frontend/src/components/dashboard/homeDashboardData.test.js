import {
  describeHomeDashboardFailures,
  fetchHomeDashboardSections,
  resolveDashboardPrimaryResults,
} from './homeDashboardData';

const fulfilled = (data) => ({ status: 'fulfilled', value: { data } });
const rejected = (message = 'failed') => ({ status: 'rejected', reason: new Error(message) });

describe('homeDashboardData', () => {
  test('resolves every primary dashboard section independently', () => {
    const result = resolveDashboardPrimaryResults([
      fulfilled({ characters: [{ id: 'hero-1' }] }),
      fulfilled([{ id: 'campaign-1' }]),
      fulfilled({ is_admin: false }),
      fulfilled({ feedback_enabled: true }),
      fulfilled({ homebrew: { items: [{ id: 'item-1', name: 'Lantern' }] } }),
    ]);

    expect(result).toEqual({
      characters: [{ id: 'hero-1' }],
      campaigns: [{ id: 'campaign-1' }],
      isAdmin: false,
      siteSettings: { feedback_enabled: true },
      homebrewItems: [{ id: 'item-1', name: 'Lantern', content_type: 'items' }],
      failures: [],
    });
  });

  test('returns null only for failed sections so callers can preserve last-known-good state', () => {
    const result = resolveDashboardPrimaryResults([
      rejected('characters offline'),
      fulfilled({ campaigns: [{ id: 'campaign-1' }] }),
      rejected('admin check offline'),
      fulfilled({ campaign_creation_enabled: true }),
      rejected('homebrew offline'),
    ]);

    expect(result.characters).toBeNull();
    expect(result.campaigns).toEqual([{ id: 'campaign-1' }]);
    expect(result.isAdmin).toBeNull();
    expect(result.siteSettings).toEqual({ campaign_creation_enabled: true });
    expect(result.homebrewItems).toBeNull();
    expect(result.failures).toEqual(['characters', 'admin access', 'homebrew']);
  });

  test('does not convert malformed successful responses into believable empty state', () => {
    const result = resolveDashboardPrimaryResults([
      fulfilled({ unexpected: [] }),
      fulfilled({ nope: [] }),
      fulfilled({ role: 'owner' }),
      fulfilled([]),
      fulfilled({ homebrew: { unexpected: 'not-a-list' } }),
    ]);

    expect(result.characters).toBeNull();
    expect(result.campaigns).toBeNull();
    expect(result.isAdmin).toBeNull();
    expect(result.siteSettings).toBeNull();
    expect(result.homebrewItems).toBeNull();
    expect(result.failures).toEqual(['characters', 'campaigns', 'admin access', 'site settings', 'homebrew']);
  });

  test('loads admin overview only after admin access is confirmed', async () => {
    const client = {
      get: jest.fn((path) => {
        if (path === '/characters') return Promise.resolve({ data: [] });
        if (path === '/campaigns') return Promise.resolve({ data: [] });
        if (path === '/admin/check') return Promise.resolve({ data: { is_admin: true } });
        if (path === '/site-settings') return Promise.resolve({ data: {} });
        if (path === '/homebrew') return Promise.resolve({ data: { homebrew: {} } });
        if (path === '/admin/mission-overview') return Promise.resolve({ data: { new_feedback_count: 3 } });
        return Promise.reject(new Error(`Unexpected path ${path}`));
      }),
    };

    const result = await fetchHomeDashboardSections(client);

    expect(result.ok).toBe(true);
    expect(result.isAdmin).toBe(true);
    expect(result.adminOverview).toEqual({ new_feedback_count: 3 });
    expect(client.get).toHaveBeenCalledWith('/admin/mission-overview');
  });

  test('preserves prior admin overview when its refresh fails', async () => {
    const client = {
      get: jest.fn((path) => {
        if (path === '/characters') return Promise.resolve({ data: [] });
        if (path === '/campaigns') return Promise.resolve({ data: [] });
        if (path === '/admin/check') return Promise.resolve({ data: { is_admin: true } });
        if (path === '/site-settings') return Promise.resolve({ data: {} });
        if (path === '/homebrew') return Promise.resolve({ data: { homebrew: {} } });
        if (path === '/admin/mission-overview') return Promise.reject(new Error('overview offline'));
        return Promise.reject(new Error(`Unexpected path ${path}`));
      }),
    };

    const result = await fetchHomeDashboardSections(client);

    expect(result.ok).toBe(false);
    expect(result.isAdmin).toBe(true);
    expect(result.adminOverview).toBeNull();
    expect(result.failures).toEqual(['admin overview']);
  });

  test('does not request admin overview when admin access is unknown', async () => {
    const client = {
      get: jest.fn((path) => {
        if (path === '/characters') return Promise.resolve({ data: [] });
        if (path === '/campaigns') return Promise.resolve({ data: [] });
        if (path === '/admin/check') return Promise.reject(new Error('admin check offline'));
        if (path === '/site-settings') return Promise.resolve({ data: {} });
        if (path === '/homebrew') return Promise.resolve({ data: { homebrew: {} } });
        return Promise.reject(new Error(`Unexpected path ${path}`));
      }),
    };

    const result = await fetchHomeDashboardSections(client);

    expect(result.isAdmin).toBeNull();
    expect(result.adminOverview).toBeNull();
    expect(result.failures).toEqual(['admin access']);
    expect(client.get).not.toHaveBeenCalledWith('/admin/mission-overview');
  });

  test('describes partial failures without claiming an empty dashboard is valid', () => {
    expect(describeHomeDashboardFailures(['characters', 'homebrew'])).toBe(
      'Could not refresh characters and homebrew. Showing last known data where available.',
    );
  });
});
