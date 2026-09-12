import {
  describePlayerDashboardFailures,
  fetchPlayerDashboardSections,
  fetchPlayerHandoutSummary,
  resolvePlayerDashboardSettledResults,
} from './playerDashboardData';

const fulfilled = (data) => ({ status: 'fulfilled', value: { data } });
const rejected = (message = 'failed') => ({ status: 'rejected', reason: new Error(message) });

describe('playerDashboardData', () => {
  test('loads all dashboard sections and merges campaign sources without duplicates', () => {
    const result = resolvePlayerDashboardSettledResults([
      fulfilled({ characters: [{ id: 'hero-1', name: 'Rook' }] }),
      fulfilled([{ id: 'c1', name: 'Owned campaign' }]),
      fulfilled({ campaigns: [{ id: 'c1', name: 'Joined copy' }, { id: 'c2', name: 'Joined campaign' }] }),
      fulfilled([{ id: 'h1', read: false, saved: true }, { id: 'h2', read: true, saved: false }]),
    ]);

    expect(result).toEqual({
      ok: true,
      failures: [],
      characters: [{ id: 'hero-1', name: 'Rook' }],
      campaigns: [{ id: 'c1', name: 'Joined copy' }, { id: 'c2', name: 'Joined campaign' }],
      handoutSummary: { total: 2, unread: 1, saved: 1 },
    });
  });

  test('hides removed and retired campaign memberships from the current player list', () => {
    const result = resolvePlayerDashboardSettledResults([
      fulfilled([]),
      fulfilled([]),
      fulfilled([
        { id: 'active', name: 'Active', member_status: 'active' },
        { id: 'pending', name: 'Pending', member_status: 'pending' },
        { id: 'removed', name: 'Removed', member_status: 'removed' },
        { id: 'retired', name: 'Retired', member_status: 'retired' },
      ]),
      fulfilled([]),
    ]);

    expect(result.campaigns.map(campaign => campaign.id)).toEqual(['active', 'pending']);
  });

  test('treats owned and joined campaign requests as one logical section', () => {
    const result = resolvePlayerDashboardSettledResults([
      fulfilled([{ id: 'hero-1' }]),
      fulfilled([{ id: 'c1' }]),
      rejected('joined campaigns failed'),
      fulfilled([]),
    ]);

    expect(result.ok).toBe(false);
    expect(result.failures).toEqual(['campaigns']);
    expect(result.characters).toEqual([{ id: 'hero-1' }]);
    expect(result.campaigns).toBeNull();
    expect(result.handoutSummary).toEqual({ total: 0, unread: 0, saved: 0 });
  });

  test('preserves successful sections when other requests fail', () => {
    const result = resolvePlayerDashboardSettledResults([
      rejected('characters failed'),
      fulfilled({ campaigns: [{ id: 'c1' }] }),
      fulfilled([]),
      rejected('handouts failed'),
    ]);

    expect(result.ok).toBe(false);
    expect(result.failures).toEqual(['characters', 'handouts']);
    expect(result.characters).toBeNull();
    expect(result.campaigns).toEqual([{ id: 'c1' }]);
    expect(result.handoutSummary).toBeNull();
  });

  test('does not turn malformed successful responses into believable empty data', () => {
    const result = resolvePlayerDashboardSettledResults([
      fulfilled({ unexpected: [] }),
      fulfilled([]),
      fulfilled([]),
      fulfilled({ nope: [] }),
    ]);

    expect(result.failures).toEqual(['characters', 'handouts']);
    expect(result.characters).toBeNull();
    expect(result.handoutSummary).toBeNull();
  });

  test('fetches every dashboard source independently by default', async () => {
    const client = {
      get: jest.fn((path) => {
        if (path === '/characters') return Promise.resolve({ data: [] });
        if (path === '/campaigns') return Promise.resolve({ data: [] });
        if (path === '/campaign-invites/joined/list') return Promise.reject(new Error('offline'));
        if (path === '/player/handouts') return Promise.resolve({ data: [] });
        return Promise.reject(new Error(`Unexpected path ${path}`));
      }),
    };

    const result = await fetchPlayerDashboardSections(client);

    expect(client.get).toHaveBeenCalledTimes(4);
    expect(result.ok).toBe(false);
    expect(result.failures).toEqual(['campaigns']);
  });

  test('core dashboard load does not wait for the handout collection', async () => {
    const client = {
      get: jest.fn((path) => {
        if (path === '/characters') return Promise.resolve({ data: [] });
        if (path === '/campaigns') return Promise.resolve({ data: [] });
        if (path === '/campaign-invites/joined/list') return Promise.resolve({ data: [] });
        return Promise.reject(new Error(`Unexpected path ${path}`));
      }),
    };

    const result = await fetchPlayerDashboardSections(client, { includeHandouts: false });

    expect(client.get).toHaveBeenCalledTimes(3);
    expect(client.get).not.toHaveBeenCalledWith('/player/handouts');
    expect(result).toEqual({
      ok: true,
      failures: [],
      characters: [],
      campaigns: [],
      handoutSummary: null,
    });
  });

  test('handout summary uses the lightweight count endpoint after the dashboard is visible', async () => {
    const client = {
      get: jest.fn().mockResolvedValue({
        data: { total: 3, unread: 2, saved: 1 },
      }),
    };

    await expect(fetchPlayerHandoutSummary(client)).resolves.toEqual({ total: 3, unread: 2, saved: 1 });
    expect(client.get).toHaveBeenCalledWith('/player/handouts/summary');
  });

  test('campaign handout summary sends a campaign filter', async () => {
    const client = {
      get: jest.fn().mockResolvedValue({
        data: { total: 2, unread: 1, saved: 0 },
      }),
    };

    await expect(fetchPlayerHandoutSummary(client, 'campaign-1')).resolves.toEqual({ total: 2, unread: 1, saved: 0 });
    expect(client.get).toHaveBeenCalledWith('/player/handouts/summary', {
      params: { campaign_id: 'campaign-1' },
    });
  });

  test('rejects malformed handout summary data instead of showing fake zeroes', async () => {
    const client = {
      get: jest.fn().mockResolvedValue({ data: { total: 'many' } }),
    };

    await expect(fetchPlayerHandoutSummary(client)).rejects.toThrow('Malformed received handout summary response');
  });

  test('describes partial failures without claiming a full refresh succeeded', () => {
    expect(describePlayerDashboardFailures(['characters', 'campaigns'])).toBe(
      'Could not refresh characters and campaigns. Showing last known data where available.',
    );
  });
});
