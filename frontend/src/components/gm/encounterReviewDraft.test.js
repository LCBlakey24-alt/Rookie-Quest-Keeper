/**
 * The GM's encounter choices must survive looking at another tool.
 */
import {
  clearDraft,
  createEmptyDraft,
  draftHasUnsavedWork,
  draftStorageKey,
  enabledBaseKeysFrom,
  includedPlayerIdsFrom,
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

describe('a draft belongs to one campaign and one encounter', () => {
  test('the key names both', () => {
    expect(draftStorageKey('camp-1', 'enc-1')).toBe('rqk.encounterReviewDraft.camp-1.enc-1');
  });

  test('round trips', () => {
    const store = memoryStore();
    const draft = { ...createEmptyDraft('camp-1', 'enc-1'), excludedPlayerIds: ['p2'] };
    expect(writeDraft(draft, store)).toBe(true);
    expect(readDraft('camp-1', 'enc-1', store).excludedPlayerIds).toEqual(['p2']);
  });

  test('another campaign cannot see it', () => {
    const store = memoryStore();
    writeDraft({ ...createEmptyDraft('camp-1', 'enc-1'), excludedPlayerIds: ['p2'] }, store);
    expect(readDraft('camp-2', 'enc-1', store)).toBeNull();
  });

  test('another encounter cannot see it', () => {
    const store = memoryStore();
    writeDraft({ ...createEmptyDraft('camp-1', 'enc-1'), excludedPlayerIds: ['p2'] }, store);
    expect(readDraft('camp-1', 'enc-2', store)).toBeNull();
  });

  test('a draft whose stored campaign disagrees with its key is refused', () => {
    const store = memoryStore({
      'rqk.encounterReviewDraft.camp-1.enc-1': JSON.stringify(
        { ...createEmptyDraft('camp-SOMEWHERE-ELSE', 'enc-1'), version: 1 },
      ),
    });
    expect(readDraft('camp-1', 'enc-1', store)).toBeNull();
  });

  test('an older format is ignored rather than misread', () => {
    const store = memoryStore({
      'rqk.encounterReviewDraft.camp-1.enc-1': JSON.stringify({ version: 0, campaignId: 'camp-1', encounterId: 'enc-1' }),
    });
    expect(readDraft('camp-1', 'enc-1', store)).toBeNull();
  });

  test('unreadable storage is survivable', () => {
    const hostile = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
    expect(readDraft('camp-1', 'enc-1', hostile)).toBeNull();
    expect(writeDraft(createEmptyDraft('camp-1', 'enc-1'), hostile)).toBe(false);
  });

  test('discarding removes only that encounter', () => {
    const store = memoryStore();
    writeDraft({ ...createEmptyDraft('camp-1', 'enc-1'), extraNpcIds: ['a'] }, store);
    writeDraft({ ...createEmptyDraft('camp-1', 'enc-2'), extraNpcIds: ['b'] }, store);
    clearDraft('camp-1', 'enc-1', store);
    expect(readDraft('camp-1', 'enc-1', store)).toBeNull();
    expect(readDraft('camp-1', 'enc-2', store).extraNpcIds).toEqual(['b']);
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
