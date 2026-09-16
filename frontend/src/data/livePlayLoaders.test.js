import {
  describeLiveLoadErrors,
  loadEncounterReviewSections,
  loadLiveSessionSections,
} from './livePlayLoaders';

function apiFrom(map) {
  return {
    get: jest.fn(async (url) => {
      const value = map[url];
      if (value instanceof Error) throw value;
      if (value && value.reject) throw value.reject;
      return { data: value };
    }),
  };
}

describe('Live Play section loading', () => {
  test('loads the Live Play shell from one bootstrap request when available', async () => {
    const apiClient = apiFrom({
      '/campaigns/c0/live-bootstrap': {
        campaign: { id: 'c0', name: 'Fast Table' },
        players: [{ id: 'p1', name: 'Hero' }],
        scenarios: [{ id: 's1', name: 'Ambush' }],
        calendar: { current_day: 4 },
        notes: [{ id: 'n1', content: 'Previously...' }],
      },
    });

    const result = await loadLiveSessionSections(apiClient, 'c0');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c0/live-bootstrap');
    expect(result.errors).toEqual([]);
    expect(result.sections.campaign).toEqual({ ok: true, data: { id: 'c0', name: 'Fast Table' } });
    expect(result.sections.players.data).toHaveLength(1);
    expect(result.sections.scenarios.data).toHaveLength(1);
    expect(result.sections.notes.data).toHaveLength(1);
  });

  test('keeps a failed party read distinct from a legitimate empty party when bootstrap falls back', async () => {
    const apiClient = apiFrom({
      '/campaigns/c1/live-bootstrap': new Error('bootstrap unavailable'),
      '/campaigns/c1': { id: 'c1', name: 'Test' },
      '/campaigns/c1/players': new Error('offline'),
      '/campaigns/c1/combat-scenarios': [],
      '/campaigns/c1/calendar': null,
      '/campaigns/c1/ingame-notes': [],
    });

    const result = await loadLiveSessionSections(apiClient, 'c1');

    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/live-bootstrap');
    expect(apiClient.get).toHaveBeenCalledWith('/campaigns/c1/players');
    expect(result.sections.players.ok).toBe(false);
    expect(result.sections.players.data).toBeUndefined();
    expect(result.sections.scenarios).toEqual({ ok: true, data: [] });
    expect(result.errors.map(item => item.key)).toEqual(['players']);
    expect(describeLiveLoadErrors(result.errors)).toBe('party');
  });

  test('uses the legacy player endpoint when live-party is unavailable', async () => {
    const apiClient = apiFrom({
      '/campaigns/c2': { id: 'c2', name: 'Fallback' },
      '/campaigns/c2/combat-scenarios': [],
      '/campaigns/c2/live-party': new Error('new endpoint unavailable'),
      '/campaigns/c2/players': [{ id: 'p1', name: 'Hero' }],
      '/campaigns/c2/npcs': [],
      '/campaigns/c2/live-state': { companion_npc_ids: [] },
    });

    const result = await loadEncounterReviewSections(apiClient, 'c2');

    expect(result.sections.players.ok).toBe(true);
    expect(result.sections.players.source).toBe('players-fallback');
    expect(result.sections.players.data).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });

  test('reports party unavailable only when both party endpoints fail', async () => {
    const apiClient = apiFrom({
      '/campaigns/c3': { id: 'c3', name: 'Offline' },
      '/campaigns/c3/combat-scenarios': [],
      '/campaigns/c3/live-party': new Error('live fail'),
      '/campaigns/c3/players': new Error('legacy fail'),
      '/campaigns/c3/npcs': [],
      '/campaigns/c3/live-state': { companion_npc_ids: [] },
    });

    const result = await loadEncounterReviewSections(apiClient, 'c3');

    expect(result.sections.players.ok).toBe(false);
    expect(result.errors.map(item => item.key)).toContain('players');
  });

  test('describes multiple failed sections without calling them empty', () => {
    expect(describeLiveLoadErrors([
      { label: 'party' },
      { label: 'encounters' },
      { label: 'notes' },
    ])).toBe('party, encounters, and notes');
  });
});
