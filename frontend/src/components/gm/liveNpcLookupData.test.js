import {
  describeLiveNpcLookupFailures,
  fetchLiveNpcLookupSections,
  resolveLiveNpcLookupResults,
} from './liveNpcLookupData';

const ok = (data) => ({ status: 'fulfilled', value: { data } });
const failed = () => ({ status: 'rejected', reason: new Error('unavailable') });

describe('liveNpcLookupData', () => {
  test('keeps NPC, location, and travelling state independent', () => {
    const result = resolveLiveNpcLookupResults([
      ok([{ id: 'npc-1', name: 'Mabel' }]),
      failed(),
      ok({ companion_npc_ids: ['npc-1'] }),
    ]);

    expect(result.npcs).toEqual([{ id: 'npc-1', name: 'Mabel' }]);
    expect(result.locations).toBeNull();
    expect(result.companionIds).toEqual(['npc-1']);
    expect(result.failures).toEqual(['locations']);
    expect(result.ok).toBe(false);
  });

  test('accepts wrapped NPC and location list responses', () => {
    const result = resolveLiveNpcLookupResults([
      ok({ npcs: [{ id: 'npc-1' }] }),
      ok({ locations: [{ id: 'loc-1' }] }),
      ok({ companion_npc_ids: [] }),
    ]);

    expect(result.ok).toBe(true);
    expect(result.npcs).toEqual([{ id: 'npc-1' }]);
    expect(result.locations).toEqual([{ id: 'loc-1' }]);
    expect(result.companionIds).toEqual([]);
  });

  test('malformed successful responses are not treated as empty state', () => {
    const result = resolveLiveNpcLookupResults([
      ok({ unexpected: [] }),
      ok({ nope: [] }),
      ok({}),
    ]);

    expect(result.npcs).toBeNull();
    expect(result.locations).toBeNull();
    expect(result.companionIds).toBeNull();
    expect(result.failures).toEqual(['NPCs', 'locations', 'travelling party']);
  });

  test('fetches all three live NPC sections even when one fails', async () => {
    const client = { get: jest.fn((path) => {
      if (path.endsWith('/npcs')) return Promise.resolve({ data: [{ id: 'npc-1' }] });
      if (path.endsWith('/locations')) return Promise.reject(new Error('locations unavailable'));
      if (path.endsWith('/live-state')) return Promise.resolve({ data: { companion_npc_ids: [] } });
      return Promise.reject(new Error('unexpected path'));
    }) };

    const result = await fetchLiveNpcLookupSections(client, 'campaign-1');

    expect(client.get).toHaveBeenCalledTimes(3);
    expect(result.npcs).toEqual([{ id: 'npc-1' }]);
    expect(result.locations).toBeNull();
    expect(result.companionIds).toEqual([]);
  });

  test('describes the stale sections clearly', () => {
    expect(describeLiveNpcLookupFailures(['locations', 'travelling party'])).toBe(
      'Could not refresh locations and travelling party. Showing last known data where available.',
    );
  });
});
