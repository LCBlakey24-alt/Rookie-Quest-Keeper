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
const ACCOUNT = 'keeper-gm';

function readForTest(campaignId, storage, options = {}) {
  return readCombatCheckpoint(campaignId, storage, { accountId: ACCOUNT, ...options });
}

function goodCheckpoint(overrides = {}) {
  return {
    version: CHECKPOINT_VERSION,
    ownerId: ACCOUNT,
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
    const result = readForTest(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(result.status).toBe('ok');
    expect(result.checkpoint.round).toBe(3);
  });

  test('the recovered encounter keeps its name, so the GM knows which fight this is', () => {
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(goodCheckpoint()));
    const scenario = scenarioFromCheckpoint(checkpoint);
    expect(scenario.id).toBe('enc-7');
    expect(scenario.name).toBe('Dock ambush');
    expect(scenario.combatants).toHaveLength(2);
    expect(scenario.recovered).toBe(true);
  });

  test('nothing saved is reported as nothing, not as a broken fight', () => {
    expect(readForTest(CAMPAIGN, storageWith(undefined)).status).toBe('none');
  });
});

describe('a checkpoint that cannot be trusted is refused', () => {
  test('unparseable JSON', () => {
    expect(readForTest(CAMPAIGN, storageWith('{not json')).status).toBe('corrupt');
  });

  test('no combatants at all', () => {
    expect(readForTest(CAMPAIGN, storageWith(goodCheckpoint({ combatants: [] }))).status).toBe('corrupt');
  });

  test('combatants that are not records', () => {
    expect(readForTest(CAMPAIGN, storageWith(goodCheckpoint({ combatants: ['Goblin', 3] }))).status).toBe('corrupt');
  });

  test('a combatant with no id, which nothing downstream can address', () => {
    const broken = goodCheckpoint({ combatants: [{ name: 'Goblin', hp: 7 }] });
    expect(readForTest(CAMPAIGN, storageWith(broken)).status).toBe('corrupt');
  });

  test('a checkpoint belonging to another campaign', () => {
    const foreign = goodCheckpoint({ campaignId: 'camp-OTHER' });
    expect(readForTest(CAMPAIGN, storageWith(foreign)).status).toBe('foreign');
  });

  test('a checkpoint written by a newer version is left alone rather than misread', () => {
    const future = goodCheckpoint({ version: CHECKPOINT_VERSION + 5 });
    expect(readForTest(CAMPAIGN, storageWith(future)).status).toBe('unsupported');
  });

  test('storage that throws is survivable', () => {
    const hostile = { getItem: () => { throw new Error('denied'); } };
    expect(readForTest(CAMPAIGN, hostile).status).toBe('unreadable');
  });

  test('a round or turn that is not a number does not become NaN downstream', () => {
    const odd = goodCheckpoint({ round: 'three', currentTurn: null });
    const result = readForTest(CAMPAIGN, storageWith(odd));
    expect(result.status).toBe('ok');
    expect(result.checkpoint.round).toBe(1);
    expect(result.checkpoint.currentTurn).toBe(0);
  });

  test('a turn past the end of the roster is clamped', () => {
    const result = readForTest(CAMPAIGN, storageWith(goodCheckpoint({ currentTurn: 99 })));
    expect(result.checkpoint.currentTurn).toBe(1);
  });
});

describe('a recovered fight never invents its own pre-combat baseline', () => {
  test('stored baselines are returned as they were', () => {
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(recoveredBaselines(checkpoint)).toEqual({ 'char-1': { hp: 54, max_hp: 54 } });
  });

  test('missing baselines stay missing rather than being read off damaged combatants', () => {
    // Rina is on 22 of 54. Treating 22 as her pre-combat state would sync a
    // wound that already happened, or hide one that did. CombatPageTable
    // already refuses an offline end when a baseline is absent; it must be
    // allowed to see that it is absent.
    const noBaselines = goodCheckpoint({ initialPlayerStates: undefined });
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(noBaselines));
    expect(recoveredBaselines(checkpoint)).toEqual({});
  });

  test('a baseline for someone not in the fight is dropped', () => {
    const stale = goodCheckpoint({ initialPlayerStates: { 'char-1': { hp: 54 }, 'char-GONE': { hp: 30 } } });
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(stale));
    expect(Object.keys(recoveredBaselines(checkpoint))).toEqual(['char-1']);
  });
});

describe('everything the fight needs survives the round trip', () => {
  test('state the GM would lose if recovery dropped it', () => {
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(checkpoint.combatants[0]).toMatchObject({ hp: 22, max_hp: 54, initiative: 18, character_id: 'char-1' });
    expect(checkpoint.selectedMapId).toBe('map-2');
    expect(checkpoint.grid_cols).toBe(30);
    expect(checkpoint.grid_rows).toBe(20);
    expect(checkpoint.feet_per_square).toBe(5);
    expect(checkpoint.mapTokens).toEqual([{ id: 't1', x: 10, y: 20 }]);
    expect(checkpoint.collectedLoot).toEqual([{ name: 'Rusty dagger' }]);
    expect(checkpoint.round).toBe(3);
    expect(checkpoint.currentTurn).toBe(1);
  });

  test('generic terrain survives an owned checkpoint round trip', () => {
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(goodCheckpoint({
      selectedMapId: '', terrain_type: 'cobblestone',
    })));
    expect(checkpoint.terrain_type).toBe('cobblestone');
    expect(scenarioFromCheckpoint(checkpoint).terrain_type).toBe('cobblestone');
  });

  test('a GM switch from a linked map to generic survives refresh without resetting the fight', () => {
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(goodCheckpoint({
      selectedMapId: '',
      map_override_generic: true,
      terrain_type: 'grass',
      mapTokens: [{ id: 'c1', x: 7, y: 4 }],
      collectedLoot: [{ name: 'Magic dagger' }],
    })));
    expect(checkpoint.map_override_generic).toBe(true);
    const restored = scenarioFromCheckpoint(checkpoint);
    expect(restored.battlefield_mode).toBe('generic');
    expect(restored.map_id).toBe('');
    expect(restored.terrain_type).toBe('grass');
    expect(checkpoint.combatants[0].hp).toBe(22);
    expect(checkpoint.mapTokens).toEqual([{ id: 'c1', x: 7, y: 4 }]);
    expect(checkpoint.collectedLoot).toEqual([{ name: 'Magic dagger' }]);
  });

  test('older checkpoints without a terrain choice get the safe stone default', () => {
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(checkpoint.terrain_type).toBe('stone');
  });

  test('where the GM came from is remembered, so End Combat goes back there', () => {
    const { checkpoint } = readForTest(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(checkpoint.source).toBe('live-play');
  });

  test('an older checkpoint with no version or campaign id is still accepted', () => {
    // Fights already in progress on someone's laptop were written by the
    // previous format. Refusing those would lose the very thing this protects.
    const legacy = goodCheckpoint();
    delete legacy.version;
    delete legacy.ownerId;
    delete legacy.campaignId;
    delete legacy.source;
    const result = readForTest(CAMPAIGN, storageWith(legacy));
    expect(result.status).toBe('legacy-unverified');
    const verified = readForTest(CAMPAIGN, storageWith(legacy), { legacyOwnerVerified: true });
    expect(verified.status).toBe('ok');
    expect(verified.checkpoint.source).toBe('campaign-prep');
  });
});

describe('account boundaries, legacy saves and distinct combatants', () => {
  test('another signed-in account cannot receive checkpoint contents', () => {
    const original = JSON.stringify(goodCheckpoint());
    const storage = storageWith(original);
    const result = readForTest(CAMPAIGN, storage, { accountId: 'another-gm' });
    expect(result.status).toBe('foreign-account');
    expect(result.checkpoint).toBeUndefined();
    expect(storage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(original);
  });

  test('a username without a token-derived session cannot unlock combat', () => {
    const result = readForTest(CAMPAIGN, storageWith(goodCheckpoint()), { accountId: '' });
    expect(result.status).toBe('auth-required');
    expect(result.checkpoint).toBeUndefined();
  });

  test('offline legacy verification failure keeps the original bytes', () => {
    const older = goodCheckpoint({ ownerId: undefined, version: undefined });
    const original = JSON.stringify(older);
    const storage = storageWith(original);
    const blocked = readForTest(CAMPAIGN, storage);
    expect(blocked.status).toBe('legacy-unverified');
    expect(blocked.checkpoint).toBeUndefined();
    expect(storage.getItem(combatCheckpointKey(CAMPAIGN))).toBe(original);
  });

  test('same-name enemies retain different IDs, wounds, death saves and loot', () => {
    const creatures = [
      { id: 'goblin-a', name: 'Goblin', hp: 4, maxHp: 7, tempHp: 2, initiative: 18, conditions: ['prone'] },
      { id: 'goblin-b', name: 'Goblin', hp: 1, maxHp: 7, tempHp: 0, initiative: 10,
        deathSaves: { successes: 1, failures: 2 } },
    ];
    const result = readForTest(CAMPAIGN, storageWith(goodCheckpoint({
      combatants: creatures, currentTurn: 1, round: 4,
      collectedLoot: [{ name: 'Copper key', offlineOperationId: 'loot-1' }],
    })));
    expect(result.status).toBe('ok');
    expect(result.checkpoint.combatants).toEqual(creatures);
    expect(result.checkpoint.currentTurn).toBe(1);
    expect(result.checkpoint.round).toBe(4);
    expect(result.checkpoint.collectedLoot).toEqual([{ name: 'Copper key', offlineOperationId: 'loot-1' }]);
  });

  test('duplicate combatant IDs are rejected (name duplicates are not)', () => {
    const combatants = goodCheckpoint().combatants.map(item => ({ ...item, id: 'same-id' }));
    expect(readForTest(CAMPAIGN, storageWith(goodCheckpoint({ combatants }))).status).toBe('corrupt');
  });
});


describe('encounter start snapshot for safe Reset', () => {
  test('a valid original roster survives recovery separately from current wounds', () => {
    const start = [
      { id: 'c1', name: 'Rina Ironside', hp: 54, maxHp: 54 },
      { id: 'c2', name: 'Goblin', hp: 7, maxHp: 7 },
    ];
    const checkpoint = goodCheckpoint({ startingCombatants: start });
    const result = readForTest(CAMPAIGN, storageWith(checkpoint));
    expect(result.status).toBe('ok');
    expect(result.checkpoint.startingCombatants).toEqual(start);
    expect(result.checkpoint.combatants[0].hp).toBe(22);
  });

  test('older or corrupt starting rosters disable Reset without losing active combat', () => {
    const old = readForTest(CAMPAIGN, storageWith(goodCheckpoint()));
    expect(old.status).toBe('ok');
    expect(old.checkpoint.startingCombatants).toBeNull();

    const invalid = readForTest(CAMPAIGN, storageWith(goodCheckpoint({
      startingCombatants: [
        { id: 'duplicate', hp: 7 },
        { id: 'duplicate', hp: 2 },
      ],
    })));
    expect(invalid.status).toBe('ok');
    expect(invalid.checkpoint.startingCombatants).toBeNull();
    expect(invalid.checkpoint.combatants[0].hp).toBe(22);
  });
});
