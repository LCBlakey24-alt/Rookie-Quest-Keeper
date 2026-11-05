/**
 * A fight must survive the tab it was started in.
 *
 * CombatPageTable reads its encounter from location.state only. Refresh the
 * combat page, or open /combat/<id> in a second tab, and that state is gone,
 * so the GM is bounced back to the campaign with "No combat encounter found"
 * while the entire fight -- HP, conditions, round, initiative, map tokens,
 * collected loot -- sits unread in localStorage.
 *
 * Recovery has to be careful rather than eager: a half-written or foreign
 * checkpoint must be refused outright rather than turned into a plausible
 * looking fight that quietly syncs wrong numbers to real character sheets.
 */
import {
  CHECKPOINT_VERSION,
  combatCheckpointKey,
  readCombatCheckpoint,
  recoveredBaselines,
  scenarioFromCheckpoint,
} from './combatCheckpoint';

const CAMPAIGN = 'camp-1';

function goodCheckpoint(overrides = {}) {
  return {
    version: CHECKPOINT_VERSION,
    campaignId: CAMPAIGN,
    scenarioId: 'enc-7',
    scenarioName: 'Dock ambush',
    combatants: [
      { id: 'c1', name: 'Rina Ironside', type: 'player', character_id: 'char-1', hp: 22, max_hp: 54, initiative: 18 },
      { id: 'c2', name: 'Goblin', type: 'enemy', hp: 7, max_hp: 7, initiative: 12 },
    ],
    currentTurn: 1,
    round: 3,
    selectedMapId: 'map-2',
    mapTokens: [{ id: 't1', x: 10, y: 20 }],
    collectedLoot: [{ name: 'Rusty dagger' }],
    initialPlayerStates: { 'char-1': { hp: 54, max_hp: 54 } },
    source: 'live-play',
    savedAt: 1762300000000,
    ...overrides,
  };
}

function storageWith(value, key = combatCheckpointKey(CAMPAIGN)) {
  const store = new Map();
  if (value !== undefined) store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  return { getItem: k => (store.has(k) ? store.get(k) : null) };
}

describe('finding a fight again without router state', () => {
  test('a complete checkpoint is recoverable', () => {
    const result = readCombatCheckpoint(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(result.status).toBe('ok');
    expect(result.checkpoint.round).toBe(3);
  });

  test('the recovered encounter keeps its name, so the GM knows which fight this is', () => {
    const { checkpoint } = readCombatCheckpoint(CAMPAIGN, storageWith(goodCheckpoint()));
    const scenario = scenarioFromCheckpoint(checkpoint);
    expect(scenario.id).toBe('enc-7');
    expect(scenario.name).toBe('Dock ambush');
    expect(scenario.combatants).toHaveLength(2);
    expect(scenario.recovered).toBe(true);
  });

  test('nothing saved is reported as nothing, not as a broken fight', () => {
    expect(readCombatCheckpoint(CAMPAIGN, storageWith(undefined)).status).toBe('none');
  });
});

describe('a checkpoint that cannot be trusted is refused', () => {
  test('unparseable JSON', () => {
    expect(readCombatCheckpoint(CAMPAIGN, storageWith('{not json')).status).toBe('corrupt');
  });

  test('no combatants at all', () => {
    expect(readCombatCheckpoint(CAMPAIGN, storageWith(goodCheckpoint({ combatants: [] }))).status).toBe('corrupt');
  });

  test('combatants that are not records', () => {
    expect(readCombatCheckpoint(CAMPAIGN, storageWith(goodCheckpoint({ combatants: ['Goblin', 3] }))).status).toBe('corrupt');
  });

  test('a combatant with no id, which nothing downstream can address', () => {
    const broken = goodCheckpoint({ combatants: [{ name: 'Goblin', hp: 7 }] });
    expect(readCombatCheckpoint(CAMPAIGN, storageWith(broken)).status).toBe('corrupt');
  });

  test('a checkpoint belonging to another campaign', () => {
    const foreign = goodCheckpoint({ campaignId: 'camp-OTHER' });
    expect(readCombatCheckpoint(CAMPAIGN, storageWith(foreign)).status).toBe('foreign');
  });

  test('a checkpoint written by a newer version is left alone rather than misread', () => {
    const future = goodCheckpoint({ version: CHECKPOINT_VERSION + 5 });
    expect(readCombatCheckpoint(CAMPAIGN, storageWith(future)).status).toBe('unsupported');
  });

  test('storage that throws is survivable', () => {
    const hostile = { getItem: () => { throw new Error('denied'); } };
    expect(readCombatCheckpoint(CAMPAIGN, hostile).status).toBe('unreadable');
  });

  test('a round or turn that is not a number does not become NaN downstream', () => {
    const odd = goodCheckpoint({ round: 'three', currentTurn: null });
    const result = readCombatCheckpoint(CAMPAIGN, storageWith(odd));
    expect(result.status).toBe('ok');
    expect(result.checkpoint.round).toBe(1);
    expect(result.checkpoint.currentTurn).toBe(0);
  });

  test('a turn past the end of the roster is clamped', () => {
    const result = readCombatCheckpoint(CAMPAIGN, storageWith(goodCheckpoint({ currentTurn: 99 })));
    expect(result.checkpoint.currentTurn).toBe(1);
  });
});

describe('a recovered fight never invents its own pre-combat baseline', () => {
  test('stored baselines are returned as they were', () => {
    const { checkpoint } = readCombatCheckpoint(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(recoveredBaselines(checkpoint)).toEqual({ 'char-1': { hp: 54, max_hp: 54 } });
  });

  test('missing baselines stay missing rather than being read off damaged combatants', () => {
    // Rina is on 22 of 54. Treating 22 as her pre-combat state would sync a
    // wound that already happened, or hide one that did. CombatPageTable
    // already refuses an offline end when a baseline is absent; it must be
    // allowed to see that it is absent.
    const noBaselines = goodCheckpoint({ initialPlayerStates: undefined });
    const { checkpoint } = readCombatCheckpoint(CAMPAIGN, storageWith(noBaselines));
    expect(recoveredBaselines(checkpoint)).toEqual({});
  });

  test('a baseline for someone not in the fight is dropped', () => {
    const stale = goodCheckpoint({ initialPlayerStates: { 'char-1': { hp: 54 }, 'char-GONE': { hp: 30 } } });
    const { checkpoint } = readCombatCheckpoint(CAMPAIGN, storageWith(stale));
    expect(Object.keys(recoveredBaselines(checkpoint))).toEqual(['char-1']);
  });
});

describe('everything the fight needs survives the round trip', () => {
  test('state the GM would lose if recovery dropped it', () => {
    const { checkpoint } = readCombatCheckpoint(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(checkpoint.combatants[0]).toMatchObject({ hp: 22, max_hp: 54, initiative: 18, character_id: 'char-1' });
    expect(checkpoint.selectedMapId).toBe('map-2');
    expect(checkpoint.mapTokens).toEqual([{ id: 't1', x: 10, y: 20 }]);
    expect(checkpoint.collectedLoot).toEqual([{ name: 'Rusty dagger' }]);
    expect(checkpoint.round).toBe(3);
    expect(checkpoint.currentTurn).toBe(1);
  });

  test('where the GM came from is remembered, so End Combat goes back there', () => {
    const { checkpoint } = readCombatCheckpoint(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(checkpoint.source).toBe('live-play');
  });

  test('an older checkpoint with no version or campaign id is still accepted', () => {
    // Fights already in progress on someone's laptop were written by the
    // previous format. Refusing those would lose the very thing this protects.
    const legacy = goodCheckpoint();
    delete legacy.version;
    delete legacy.campaignId;
    delete legacy.source;
    const result = readCombatCheckpoint(CAMPAIGN, storageWith(legacy));
    expect(result.status).toBe('ok');
    expect(result.checkpoint.source).toBe('campaign-prep');
  });
});
