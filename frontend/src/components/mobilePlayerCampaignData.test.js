import {
  describeMobilePlayerFailures,
  fetchCampaignWithFallback,
  fetchMobileCampaignSections,
  fetchMobileDashboardSections,
  resolveMobileCampaignResults,
  resolveMobileDashboardResults,
} from './mobilePlayerCampaignData';

const okResponse = (data) => ({ status: 'fulfilled', value: { data } });
const okValue = (value) => ({ status: 'fulfilled', value });
const failed = () => ({ status: 'rejected', reason: new Error('request failed') });

describe('mobilePlayerCampaignData', () => {
  test('treats owned and joined campaign requests as one dashboard section', () => {
    const result = resolveMobileDashboardResults([
      okResponse([{ id: 'hero-1' }]),
      okResponse([{ id: 'campaign-1' }]),
      failed(),
    ]);
    expect(result.characters).toEqual([{ id: 'hero-1' }]);
    expect(result.campaigns).toBeNull();
    expect(result.failures).toEqual(['campaigns']);
  });

  test('keeps dashboard sections independent', async () => {
    const client = { get: jest.fn((path) => {
      if (path === '/characters') return Promise.reject(new Error('unavailable'));
      if (path === '/campaigns') return Promise.resolve({ data: [{ id: 'campaign-1' }] });
      if (path === '/campaign-invites/joined/list') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected path'));
    }) };
    const result = await fetchMobileDashboardSections(client);
    expect(result.characters).toBeNull();
    expect(result.campaigns).toEqual([{ id: 'campaign-1' }]);
    expect(result.failures).toEqual(['characters']);
  });

  test('uses the fallback campaign details endpoint', async () => {
    const client = { get: jest.fn((path) => {
      if (path === '/player/campaign/c1') return Promise.reject(new Error('unavailable'));
      if (path === '/campaigns/c1') return Promise.resolve({ data: { id: 'c1', name: 'Campaign' } });
      return Promise.reject(new Error('unexpected path'));
    }) };
    const result = await fetchCampaignWithFallback(client, 'c1');
    expect(result).toEqual({ id: 'c1', name: 'Campaign' });
    expect(client.get).toHaveBeenNthCalledWith(1, '/player/campaign/c1');
    expect(client.get).toHaveBeenNthCalledWith(2, '/campaigns/c1');
  });

  test('falls back after malformed primary campaign data', async () => {
    const client = { get: jest.fn((path) => {
      if (path === '/player/campaign/c1') return Promise.resolve({ data: [] });
      if (path === '/campaigns/c1') return Promise.resolve({ data: { id: 'c1' } });
      return Promise.reject(new Error('unexpected path'));
    }) };
    expect(await fetchCampaignWithFallback(client, 'c1')).toEqual({ id: 'c1' });
  });

  test('preserves valid campaign sections when party data fails', () => {
    const result = resolveMobileCampaignResults([
      okValue({ id: 'c1' }),
      failed(),
      okResponse([{ id: 'hero-1' }]),
    ]);
    expect(result.campaign).toEqual({ id: 'c1' });
    expect(result.players).toBeNull();
    expect(result.characters).toEqual([{ id: 'hero-1' }]);
    expect(result.failures).toEqual(['party']);
  });

  test('reports campaign details unavailable only after both detail calls fail', async () => {
    const client = { get: jest.fn((path) => {
      if (path === '/player/campaign/c1' || path === '/campaigns/c1') return Promise.reject(new Error('unavailable'));
      if (path === '/campaigns/c1/players') return Promise.resolve({ data: [] });
      if (path === '/characters') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected path'));
    }) };
    const result = await fetchMobileCampaignSections(client, 'c1');
    expect(result.campaign).toBeNull();
    expect(result.players).toEqual([]);
    expect(result.characters).toEqual([]);
    expect(result.failures).toEqual(['campaign details']);
  });

  test('does not convert malformed character data into an empty list', () => {
    const result = resolveMobileDashboardResults([
      okResponse({ unexpected: [] }),
      okResponse([]),
      okResponse([]),
    ]);
    expect(result.characters).toBeNull();
    expect(result.failures).toEqual(['characters']);
  });

  test('describes partial refresh failures', () => {
    expect(describeMobilePlayerFailures(['party', 'characters'])).toBe(
      'Could not refresh party and characters. Showing last known data where available.',
    );
  });
});
