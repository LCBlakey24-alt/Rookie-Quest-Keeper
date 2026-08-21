import { clearQueuedNpcIds, playerToCombatant, readQueuedNpcIds } from './LiveEncounterLauncher';

describe('LiveEncounterLauncher player combat handoff', () => {
  test('preserves temp HP, death saves and concentration', () => {
    const combatant = playerToCombatant({
      id: 'char-1',
      character_id: 'char-1',
      name: 'Hero',
      hp: 17,
      max_hp: 40,
      temporary_hit_points: 6,
      ac: 16,
      initiativeMod: 2,
      conditions: ['poisoned'],
      death_saves_successes: 1,
      death_saves_failures: 2,
      concentrating_on: 'Bless',
      rqk_pending_combat_sync: true,
      source: 'character',
    });

    expect(combatant.hp).toBe(17);
    expect(combatant.maxHp).toBe(40);
    expect(combatant.tempHp).toBe(6);
    expect(combatant.conditions).toEqual(['poisoned']);
    expect(combatant.deathSaves).toEqual({ successes: 1, failures: 2 });
    expect(combatant.concentrating_on).toBe('Bless');
    expect(combatant.rqk_pending_combat_sync).toBe(true);
  });
});

describe('LiveEncounterLauncher queued NPC handoff', () => {
  test('reading queued NPCs does not consume the queue', () => {
    const storage = {
      getItem: jest.fn(() => JSON.stringify(['npc-1', 'missing-npc'])),
      removeItem: jest.fn(),
    };

    const queued = readQueuedNpcIds(storage, 'campaign-1', [
      { id: 'npc-1', name: 'Jordan Crow' },
      { id: 'npc-2', name: 'Godfrey Barfoot' },
    ]);

    expect(queued).toEqual(['npc-1']);
    expect(storage.getItem).toHaveBeenCalledWith('gm.liveEncounterNpcQueue.campaign-1');
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  test('queue is consumed explicitly when encounter launch commits', () => {
    const storage = { removeItem: jest.fn() };

    clearQueuedNpcIds(storage, 'campaign-1');

    expect(storage.removeItem).toHaveBeenCalledWith('gm.liveEncounterNpcQueue.campaign-1');
  });

  test('bad queued data fails safely instead of blocking encounter review', () => {
    const storage = { getItem: jest.fn(() => '{not-json') };

    expect(readQueuedNpcIds(storage, 'campaign-1', [{ id: 'npc-1' }])).toEqual([]);
  });
});
