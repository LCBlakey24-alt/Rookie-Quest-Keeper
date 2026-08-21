import { overlayQueuedCombatStateOnParty } from './queuedCombatPartyOverlay';

describe('queued combat live-party overlay', () => {
  test('uses the newest queued character combat state for the same campaign', () => {
    const party = [{
      id: 'char-1',
      character_id: 'char-1',
      source: 'character',
      name: 'Hero',
      hp: 31,
      max_hp: 40,
      temporary_hit_points: 0,
      conditions: [],
      death_saves_successes: 0,
      death_saves_failures: 0,
      concentrating_on: '',
    }];
    const records = [{
      campaignId: 'campaign-a',
      characterId: 'char-1',
      state: {
        current_hit_points: 17,
        temporary_hit_points: 6,
        conditions: ['poisoned'],
        death_saves_successes: 1,
        death_saves_failures: 2,
        concentrating_on: 'Bless',
      },
    }];

    const [hero] = overlayQueuedCombatStateOnParty(party, records, 'campaign-a');
    expect(hero.hp).toBe(17);
    expect(hero.temporary_hit_points).toBe(6);
    expect(hero.temp_hp).toBe(6);
    expect(hero.conditions).toEqual(['poisoned']);
    expect(hero.death_saves_successes).toBe(1);
    expect(hero.death_saves_failures).toBe(2);
    expect(hero.concentrating_on).toBe('Bless');
    expect(hero.rqk_pending_combat_sync).toBe(true);
  });

  test('does not leak queued state across campaigns or legacy roster rows', () => {
    const party = [
      { id: 'char-1', character_id: 'char-1', source: 'character', hp: 31 },
      { id: 'legacy-1', character_id: null, source: 'legacy', hp: 8 },
    ];
    const records = [{
      campaignId: 'campaign-b',
      characterId: 'char-1',
      state: { current_hit_points: 2 },
    }];

    const next = overlayQueuedCombatStateOnParty(party, records, 'campaign-a');
    expect(next[0].hp).toBe(31);
    expect(next[1].hp).toBe(8);
    expect(next[0].rqk_pending_combat_sync).toBeUndefined();
  });
});
