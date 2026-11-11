/**
 * The GM's encounter choices must survive looking at another tool.
 */
import {
  clearDraft,
  createEmptyDraft,
  draftHasUnsavedWork,
  draftStorageKey,
  enabledBaseKeysFrom,
  forgetDraftsInMemory,
  includedPlayerIdsFrom,
  purgeUnownedDrafts,
  readDraft,
  reconcileDraft,
  writeDraft,
} from './encounterReviewDraft';

function memoryStore(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key),
    _map: map,
  };
}

const AVAILABLE = {
  baseKeys: ['g1', 'g2', 'g3'],
  playerIds: ['p1', 'p2', 'p3'],
  companionIds: ['npc-travel'],
  npcIds: ['npc-travel', 'npc-extra'],
};

describe('defaults', () => {
  test('nothing excluded means everyone prepared is in', () => {
    const draft = createEmptyDraft('camp-1', 'enc-1');
    expect(enabledBaseKeysFrom(draft, AVAILABLE.baseKeys)).toEqual(['g1', 'g2', 'g3']);
    expect(includedPlayerIdsFrom(draft, AVAILABLE.playerIds)).toEqual(['p1', 'p2', 'p3']);
  });

  test('optional NPCs start out, not in', () => {
    const draft = createEmptyDraft('camp-1', 'enc-1');
    expect(draft.includedCompanionIds).toEqual([]);
    expect(draft.extraNpcIds).toEqual([]);
  });
});

describe('a refresh does not undo what the GM decided', () => {
  const chosen = {
    ...createEmptyDraft('camp-1', 'enc-1'),
    disabledBaseKeys: ['g2'],
    excludedPlayerIds: ['p2'],
    includedCompanionIds: ['npc-travel'],
    extraNpcIds: ['npc-extra'],
    quickCombatants: [{ id: 'q1', name: 'Wolf' }, { id: 'q2', name: 'Wolf' }],
    quickDraft: { name: 'Bandit', quantity: '3', hp: '11', ac: '13', initiative: '1' },
  };

  test('new object references change nothing', () => {
    // This is the defect: the reset effect depended on baseCombatants, so a
    // refresh returning identical content with a new array reference wiped
    // the review.
    const again = reconcileDraft(chosen, { ...AVAILABLE, baseKeys: [...AVAILABLE.baseKeys] });
    expect(again.disabledBaseKeys).toEqual(['g2']);
    expect(again.excludedPlayerIds).toEqual(['p2']);
    expect(again.includedCompanionIds).toEqual(['npc-travel']);
    expect(again.extraNpcIds).toEqual(['npc-extra']);
    expect(again.quickCombatants).toHaveLength(2);
    expect(again.quickDraft.name).toBe('Bandit');
  });

  test('an excluded player is not quietly put back', () => {
    expect(includedPlayerIdsFrom(reconcileDraft(chosen, AVAILABLE), AVAILABLE.playerIds))
      .toEqual(['p1', 'p3']);
  });

  test('a disabled enemy is not quietly re-enabled', () => {
    expect(enabledBaseKeysFrom(reconcileDraft(chosen, AVAILABLE), AVAILABLE.baseKeys))
      .toEqual(['g1', 'g3']);
  });

  test('a player who joins mid-session appears without being asked for', () => {
    const withNewcomer = reconcileDraft(chosen, { ...AVAILABLE, playerIds: [...AVAILABLE.playerIds, 'p4'] });
    expect(includedPlayerIdsFrom(withNewcomer, [...AVAILABLE.playerIds, 'p4']))
      .toEqual(['p1', 'p3', 'p4']);
  });

  test('an enemy added to the prepared encounter appears', () => {
    const keys = [...AVAILABLE.baseKeys, 'g4'];
    expect(enabledBaseKeysFrom(reconcileDraft(chosen, { ...AVAILABLE, baseKeys: keys }), keys))
      .toEqual(['g1', 'g3', 'g4']);
  });

  test('a participant that has gone is forgotten rather than left excluded', () => {
    const shrunk = reconcileDraft(chosen, { ...AVAILABLE, baseKeys: ['g1', 'g3'], playerIds: ['p1', 'p3'] });
    expect(shrunk.disabledBaseKeys).toEqual([]);
    expect(shrunk.excludedPlayerIds).toEqual([]);
  });

  test('an optional NPC that is no longer offered drops out of the selection', () => {
    const noNpcs = reconcileDraft(chosen, { ...AVAILABLE, companionIds: [], npcIds: [] });
    expect(noNpcs.includedCompanionIds).toEqual([]);
    expect(noNpcs.extraNpcIds).toEqual([]);
  });

  test('quick-added creatures are the GM\'s and the backend cannot remove them', () => {
    const emptied = reconcileDraft(chosen, { baseKeys: [], playerIds: [], companionIds: [], npcIds: [] });
    expect(emptied.quickCombatants).toHaveLength(2);
    expect(emptied.quickDraft.name).toBe('Bandit');
  });

  test('two quick creatures with the same name are both kept', () => {
    const both = reconcileDraft(chosen, AVAILABLE);
    expect(both.quickCombatants.map(item => item.id)).toEqual(['q1', 'q2']);
  });
});

describe('a draft belongs to one account, one campaign and one encounter', () => {
  const A = { accountId: 'account-a' };
  const draftFor = (campaign, encounter, owner = 'account-a', patch = {}) => (
    { ...createEmptyDraft(campaign, encounter, owner), ...patch }
  );

  beforeEach(() => forgetDraftsInMemory());

  test('the key names the account, campaign and encounter', () => {
    expect(draftStorageKey('account-a', 'camp-1', 'enc-1')).toBe('rqk.encounterReviewDraft.v2.account-a.camp-1.enc-1');
    expect(draftStorageKey('Account-A', 'camp-1', '')).toBe('rqk.encounterReviewDraft.v2.account-a.camp-1.__impromptu__');
  });

  test('round trips, and only reports saved when the write reads back', () => {
    const store = memoryStore();
    expect(writeDraft(draftFor('camp-1', 'enc-1', 'account-a', { excludedPlayerIds: ['p2'] }), { ...A, storage: store })).toBe('saved');
    forgetDraftsInMemory();
    expect(readDraft('camp-1', 'enc-1', { ...A, storage: store }).excludedPlayerIds).toEqual(['p2']);
  });

  test('another account cannot read it, even with the record copied under its key', () => {
    const store = memoryStore();
    writeDraft(draftFor('camp-1', 'enc-1', 'account-a', { excludedPlayerIds: ['p2'] }), { ...A, storage: store });
    forgetDraftsInMemory();
    expect(readDraft('camp-1', 'enc-1', { accountId: 'account-b', storage: store })).toBeNull();
    const raw = store.getItem(draftStorageKey('account-a', 'camp-1', 'enc-1'));
    store.setItem(draftStorageKey('account-b', 'camp-1', 'enc-1'), raw);
    expect(readDraft('camp-1', 'enc-1', { accountId: 'account-b', storage: store })).toBeNull();
  });

  test('a draft owned by another account is refused on write, so nothing lands in either scope', () => {
    const store = memoryStore();
    expect(writeDraft(draftFor('camp-1', 'enc-1', 'account-a'), { accountId: 'account-b', storage: store })).toBe('refused');
    expect(store._map.size).toBe(0);
  });

  test('without an account nothing is read or written', () => {
    const store = memoryStore();
    expect(writeDraft(draftFor('camp-1', 'enc-1', ''), { accountId: '', storage: store })).toBe('refused');
    expect(readDraft('camp-1', 'enc-1', { accountId: '', storage: store })).toBeNull();
    expect(store._map.size).toBe(0);
  });

  test('another campaign cannot see it', () => {
    const store = memoryStore();
    writeDraft(draftFor('camp-1', 'enc-1', 'account-a', { excludedPlayerIds: ['p2'] }), { ...A, storage: store });
    expect(readDraft('camp-2', 'enc-1', { ...A, storage: store })).toBeNull();
  });

  test('another encounter cannot see it', () => {
    const store = memoryStore();
    writeDraft(draftFor('camp-1', 'enc-1', 'account-a', { excludedPlayerIds: ['p2'] }), { ...A, storage: store });
    expect(readDraft('camp-1', 'enc-2', { ...A, storage: store })).toBeNull();
  });

  test('a record whose stored campaign disagrees with its key is refused', () => {
    const store = memoryStore({
      [draftStorageKey('account-a', 'camp-1', 'enc-1')]: JSON.stringify(draftFor('camp-SOMEWHERE-ELSE', 'enc-1')),
    });
    expect(readDraft('camp-1', 'enc-1', { ...A, storage: store })).toBeNull();
  });

  test('a v1 draft, which has no owner, is never read and is purged', () => {
    const legacyKey = 'rqk.encounterReviewDraft.camp-1.enc-1';
    const store = memoryStore({
      [legacyKey]: JSON.stringify({ version: 1, campaignId: 'camp-1', encounterId: 'enc-1', excludedPlayerIds: ['p2'] }),
      unrelated: 'kept',
    });
    store.key = index => [...store._map.keys()][index] ?? null;
    Object.defineProperty(store, 'length', { get: () => store._map.size });
    expect(readDraft('camp-1', 'enc-1', { ...A, storage: store })).toBeNull();
    purgeUnownedDrafts(store);
    expect(store.getItem(legacyKey)).toBeNull();
    expect(store.getItem('unrelated')).toBe('kept');
  });

  test('full, denied or silently-dropping storage keeps the draft in memory and says so', () => {
    const hostile = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
    expect(writeDraft(draftFor('camp-1', 'enc-1', 'account-a', { extraNpcIds: ['n1'] }), { ...A, storage: hostile })).toBe('memory');
    expect(readDraft('camp-1', 'enc-1', { ...A, storage: hostile }).extraNpcIds).toEqual(['n1']);

    const dropping = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    expect(writeDraft(draftFor('camp-1', 'enc-2', 'account-a'), { ...A, storage: dropping })).toBe('memory');
  });

  test('unreadable storage is survivable', () => {
    const hostile = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
    expect(readDraft('camp-1', 'enc-1', { ...A, storage: hostile })).toBeNull();
  });

  test('discarding removes only that encounter', () => {
    const store = memoryStore();
    writeDraft(draftFor('camp-1', 'enc-1', 'account-a', { extraNpcIds: ['a'] }), { ...A, storage: store });
    writeDraft(draftFor('camp-1', 'enc-2', 'account-a', { extraNpcIds: ['b'] }), { ...A, storage: store });
    clearDraft('camp-1', 'enc-1', { ...A, storage: store });
    expect(readDraft('camp-1', 'enc-1', { ...A, storage: store })).toBeNull();
    expect(readDraft('camp-1', 'enc-2', { ...A, storage: store }).extraNpcIds).toEqual(['b']);
  });

  test('discarding for one account leaves another account alone', () => {
    const store = memoryStore();
    writeDraft(draftFor('camp-1', 'enc-1', 'account-a', { extraNpcIds: ['a'] }), { ...A, storage: store });
    writeDraft(draftFor('camp-1', 'enc-1', 'account-b', { extraNpcIds: ['b'] }), { accountId: 'account-b', storage: store });
    clearDraft('camp-1', 'enc-1', { accountId: 'account-b', storage: store });
    expect(readDraft('camp-1', 'enc-1', { ...A, storage: store }).extraNpcIds).toEqual(['a']);
  });
});

describe('only a successful response may prune a choice', () => {
  const chosen = {
    ...createEmptyDraft('camp-1', 'enc-1', 'account-a'),
    disabledBaseKeys: ['g2'],
    excludedPlayerIds: ['p2'],
    includedCompanionIds: ['npc-travel'],
    extraNpcIds: ['npc-extra'],
  };

  test('lists that have not loaded, or failed, keep every selection', () => {
    const kept = reconcileDraft(chosen, { baseKeys: null, playerIds: null, companionIds: undefined, npcIds: null });
    expect(kept.disabledBaseKeys).toEqual(['g2']);
    expect(kept.excludedPlayerIds).toEqual(['p2']);
    expect(kept.includedCompanionIds).toEqual(['npc-travel']);
    expect(kept.extraNpcIds).toEqual(['npc-extra']);
  });

  test('a successful empty party is authoritative', () => {
    expect(reconcileDraft(chosen, { playerIds: [] }).excludedPlayerIds).toEqual([]);
  });
});

describe('knowing when there is something to lose', () => {
  test('an untouched review has nothing', () => {
    expect(draftHasUnsavedWork(createEmptyDraft('camp-1', 'enc-1'))).toBe(false);
  });

  test.each([
    ['an excluded player', { excludedPlayerIds: ['p2'] }],
    ['a disabled enemy', { disabledBaseKeys: ['g2'] }],
    ['a chosen companion', { includedCompanionIds: ['n1'] }],
    ['an extra NPC', { extraNpcIds: ['n2'] }],
    ['a quick-added creature', { quickCombatants: [{ id: 'q1' }] }],
    ['a half-typed creature name', { quickDraft: { name: 'Band' } }],
    ['a half-typed creature HP', { quickDraft: { hp: '11' } }],
  ])('%s counts', (_label, patch) => {
    expect(draftHasUnsavedWork({ ...createEmptyDraft('camp-1', 'enc-1'), ...patch })).toBe(true);
  });

  test('a quantity left at its default does not count as work', () => {
    expect(draftHasUnsavedWork({ ...createEmptyDraft('camp-1', 'enc-1'), quickDraft: { quantity: '1' } })).toBe(false);
  });
});


test('battle-map selection persists with this encounter only, including explicit no-map', () => {
  const storage = memoryStore();
  const draft = { ...createEmptyDraft('camp-1', 'enc-1', 'gm-1'), battleMapId: 'map-forest' };
  expect(writeDraft(draft, { accountId: 'gm-1', storage })).toBe('saved');
  expect(readDraft('camp-1', 'enc-1', { accountId: 'gm-1', storage }).battleMapId).toBe('map-forest');
  expect(readDraft('camp-1', 'enc-2', { accountId: 'gm-1', storage })).toBeNull();
  expect(readDraft('camp-1', 'enc-1', { accountId: 'gm-2', storage })).toBeNull();
  expect(reconcileDraft(draft, { ...AVAILABLE, mapIds: [] }).battleMapId).toBe('map-forest');
  expect(draftHasUnsavedWork(draft)).toBe(true);
  expect(draftHasUnsavedWork({ ...draft, battleMapId: '' })).toBe(true);
  expect(draftHasUnsavedWork(createEmptyDraft('camp-1', 'enc-1', 'gm-1'))).toBe(false);
});
