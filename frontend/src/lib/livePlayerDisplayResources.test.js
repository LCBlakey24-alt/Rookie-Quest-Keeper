import { loadPlayerDisplayResources, playerDisplayResourceWarning, resolvePlayerDisplayResourceResults } from './livePlayerDisplayResources';

describe('live player display resource loading', () => {
  test('keeps failed sections absent instead of converting them into empty campaign data', () => {
    const result = resolvePlayerDisplayResourceResults([
      { status: 'fulfilled', value: { data: [{ id: 'map-1' }] } },
      { status: 'rejected', reason: new Error('offline') },
      { status: 'fulfilled', value: { data: [{ id: 'encounter-1' }] } },
      { status: 'rejected', reason: new Error('offline') },
    ]);

    expect(result.data.maps).toEqual([{ id: 'map-1' }]);
    expect(result.data.scenarios).toEqual([{ id: 'encounter-1' }]);
    expect(result.data).not.toHaveProperty('npcs');
    expect(result.data).not.toHaveProperty('players');
    expect(result.failures).toEqual(['NPCs', 'players']);
    expect(playerDisplayResourceWarning(result.failures)).toMatch(/not treated as empty campaign data/i);
  });

  test('loads each resource independently', async () => {
    const apiClient = {
      get: jest.fn((url) => {
        if (url.endsWith('/npcs')) return Promise.reject(new Error('NPC endpoint unavailable'));
        return Promise.resolve({ data: [{ url }] });
      }),
    };

    const result = await loadPlayerDisplayResources(apiClient, 'campaign-1');

    expect(apiClient.get).toHaveBeenCalledTimes(4);
    expect(result.failures).toEqual(['NPCs']);
    expect(result.data.maps).toHaveLength(1);
    expect(result.data.scenarios).toHaveLength(1);
    expect(result.data.players).toHaveLength(1);
    expect(result.data).not.toHaveProperty('npcs');
  });
});
