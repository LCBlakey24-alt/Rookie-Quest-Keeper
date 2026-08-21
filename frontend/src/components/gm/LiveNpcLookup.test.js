import { queueNpcForEncounterStorage } from './LiveNpcLookup';

describe('queueNpcForEncounterStorage', () => {
  test('adds an NPC once and preserves existing queued NPCs', () => {
    const values = new Map([['gm.liveEncounterNpcQueue.c1', JSON.stringify(['npc-a'])]]);
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };

    expect(queueNpcForEncounterStorage(storage, 'c1', 'npc-b')).toBe(true);
    expect(queueNpcForEncounterStorage(storage, 'c1', 'npc-b')).toBe(true);
    expect(JSON.parse(values.get('gm.liveEncounterNpcQueue.c1'))).toEqual(['npc-a', 'npc-b']);
  });

  test('repairs malformed queue data instead of losing the new NPC', () => {
    const values = new Map([['gm.liveEncounterNpcQueue.c1', '{broken']]);
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };

    expect(queueNpcForEncounterStorage(storage, 'c1', 'npc-a')).toBe(true);
    expect(JSON.parse(values.get('gm.liveEncounterNpcQueue.c1'))).toEqual(['npc-a']);
  });

  test('returns false when storage cannot persist the handoff', () => {
    const storage = {
      getItem: () => '[]',
      setItem: () => { throw new Error('storage unavailable'); },
    };

    expect(queueNpcForEncounterStorage(storage, 'c1', 'npc-a')).toBe(false);
  });
});
