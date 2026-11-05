import { clearQueuedNpcIds, combinePreparedEncounterParty, createImpromptuEncounter, persistQueuedNpcIds, playerToCombatant, preferredPreparedEncounterId, readQueuedNpcIds } from './LiveEncounterLauncher';

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

  test('queue changes only report success after storage accepts them', () => {
    const workingStorage = { setItem: jest.fn() };
    expect(persistQueuedNpcIds(workingStorage, 'campaign-1', ['npc-2'])).toBe(true);
    expect(workingStorage.setItem).toHaveBeenCalledWith('gm.liveEncounterNpcQueue.campaign-1', JSON.stringify(['npc-2']));

    const failingStorage = { setItem: jest.fn(() => { throw new Error('storage full'); }) };
    expect(persistQueuedNpcIds(failingStorage, 'campaign-1', [])).toBe(false);
  });
});

describe('Impromptu live battles', () => {
  test('creates a one-off scenario without editing a saved encounter', () => {
    const party = [{ id: 'hero-1', name: 'Hero', type: 'player', hp: 20 }];
    const combat = createImpromptuEncounter(party, 123456);
    expect(combat).toEqual({
      id: 'impromptu-123456',
      name: 'Impromptu Battle',
      combatants: party,
      temporary: true,
    });
    expect(combat.combatants).toEqual(party);
  });

  test('safely handles an empty starting roster', () => {
    expect(createImpromptuEncounter(null, 7).combatants).toEqual([]);
  });
});


describe('Prepared Hollowmere scenarios in Live Play', () => {
  const rina = { id: 'char-rina', character_id: 'char-rina', name: 'Rina Ironside', type: 'player', hp: 54, maxHp: 54, ac: 19 };
  const orren = { id: 'char-orren', character_id: 'char-orren', name: 'Orren Oakenshade', type: 'player', hp: 38, maxHp: 38, ac: 16 };
  const josh = { id: 'char-josh', character_id: 'char-josh', name: 'Josh', type: 'player', hp: 41, maxHp: 41, ac: 15 };
  const guard = { id: 'guard-1', name: 'Chitin Guard', type: 'monster', hp: 22, ac: 14, actions: [{ name: 'Bite' }] };
  const prepared = [rina, orren, josh, guard];
  const enabledKeys = prepared.map(item => item.id);

  test('refreshes saved player snapshots with current HP/conditions without duplicates', () => {
    const liveParty = [
      { id: 'char-rina', character_id: 'char-rina', name: 'Rina Ironside', hp: 31, max_hp: 54, ac: 19, initiativeMod: 1, conditions: ['poisoned'] },
      { id: 'char-orren', character_id: 'char-orren', name: 'Orren Oakenshade', hp: 0, max_hp: 38, ac: 16, initiativeMod: 3, death_saves_failures: 1 },
      { id: 'char-josh', character_id: 'char-josh', name: 'Josh', hp: 15, max_hp: 41, ac: 15, initiativeMod: 2 },
    ];
    const launched = combinePreparedEncounterParty(prepared, liveParty, enabledKeys, liveParty.map(p => p.id));
    expect(launched).toHaveLength(4);
    expect(launched.filter(item => item.type === 'player')).toHaveLength(3);
    expect(launched.find(item => item.name === 'Rina Ironside')).toMatchObject({ hp: 31, maxHp: 54, conditions: ['poisoned'] });
    expect(launched.find(item => item.name === 'Orren Oakenshade')).toMatchObject({ hp: 0, maxHp: 38, deathSaves: { successes: 0, failures: 1 } });
    expect(launched.find(item => item.name === 'Josh')).toMatchObject({ hp: 15, ac: 15 });
    expect(launched.find(item => item.id === 'guard-1')).toEqual(guard);
  });

  test('unchecking a party member excludes their pre-saved player entry too', () => {
    const party = [rina, orren, josh];
    const launched = combinePreparedEncounterParty(prepared, party, enabledKeys, ['char-rina', 'char-orren']);
    expect(launched.filter(item => item.type === 'player').map(item => item.name)).toEqual(['Rina Ironside', 'Orren Oakenshade']);
    expect(launched.filter(item => item.type === 'monster')).toEqual([guard]);
  });

  test('prefers ready HM-01 over archived scenarios, but honours a deliberate handoff', () => {
    const scenarios = [
      { id: 'old', legacy: true },
      { id: 'hm02', live_ready: true, planned_encounter_order: 2 },
      { id: 'hm01', live_ready: true, live_default: true, planned_encounter_order: 1 },
    ];
    expect(preferredPreparedEncounterId(scenarios)).toBe('hm01');
    expect(preferredPreparedEncounterId(scenarios, '', 'old')).toBe('hm01');
    expect(preferredPreparedEncounterId(scenarios, 'hm02')).toBe('hm02');
  });
});

describe('Encounter roster uses creature instance identity', () => {
  test('keeps two enabled enemies that share a name but not an ID', () => {
    const goblins = [
      { id: 'g1', name: 'Goblin', type: 'enemy' },
      { id: 'g2', name: 'Goblin', type: 'enemy' },
    ];
    expect(combinePreparedEncounterParty(goblins, [], ['g1', 'g2'], []))
      .toEqual(goblins);
  });

  test('deduplicates repeated references to the same linked character', () => {
    const player = { id: 'sheet-1', character_id: 'char-1', name: 'Hero', hp: 5, max_hp: 20 };
    const snapshots = [
      { id: 'token-1', character_id: 'char-1', type: 'player', name: 'Hero' },
      { id: 'token-2', character_id: 'char-1', type: 'player', name: 'Hero' },
    ];
    const roster = combinePreparedEncounterParty(snapshots, [player], ['token-1', 'token-2'], ['sheet-1']);
    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({ id: 'sheet-1', hp: 5 });
  });

  test('keeps independent legacy unnamed-ID creatures, including identical names', () => {
    const legacy = [
      { type: 'enemy', name: 'Goblin' },
      { type: 'enemy', name: 'Goblin' },
    ];
    expect(combinePreparedEncounterParty(legacy, [], ['enemy:Goblin:0', 'enemy:Goblin:1'], []))
      .toHaveLength(2);
  });

  test('keeps multiple quick-added creature instances with distinct IDs', () => {
    const quick = [
      { id: 'quick-1', type: 'enemy', name: 'Wolf' },
      { id: 'quick-2', type: 'enemy', name: 'Wolf' },
      { id: 'quick-3', type: 'enemy', name: 'Wolf' },
    ];
    expect(combinePreparedEncounterParty(quick, [], quick.map(item => item.id), []))
      .toHaveLength(3);
  });
});
