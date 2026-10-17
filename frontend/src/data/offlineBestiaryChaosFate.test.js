import { EMPTY_CHAOS_FATE, FATE_EFFECTS, updateChaosFate, undoChaosFate } from './chaosFateTokens';
import { MONSTER_DATABASE } from './monsterDatabase';

describe('Eldritch Heralds Chaos/Fate economy', () => {
  test('awarding Chaos never grants Fate; spending does so one-for-one', () => {
    const awarded = updateChaosFate(EMPTY_CHAOS_FATE, 'award', 5);
    expect(awarded).toEqual(expect.objectContaining({ chaos: 5, fate: 0 }));
    const spent = updateChaosFate(awarded, 'spend', 3);
    expect(spent).toEqual(expect.objectContaining({ chaos: 2, fate: 3 }));
    expect(() => updateChaosFate(spent, 'spend', 3)).toThrow('Not enough');
    expect(undoChaosFate(spent)).toEqual(expect.objectContaining({ chaos: 5, fate: 0 }));
  });
  test('committing Fate rolls d8 per token and removes only those banked', () => {
    const state = updateChaosFate(updateChaosFate(EMPTY_CHAOS_FATE, 'award', 4), 'spend', 4);
    const updated = updateChaosFate(state, 'commit', 2, 'Old Gate Captain', () => 0);
    expect(updated.fate).toBe(2);
    expect(updated.history.at(-1).rolls).toEqual([1, 1]);
    expect(FATE_EFFECTS).toHaveLength(8);
    expect(() => updateChaosFate(updated, 'commit', 3)).toThrow('Not enough');
  });
  test('wonky and negative amounts are refused', () => {
    expect(() => updateChaosFate(EMPTY_CHAOS_FATE, 'award', -5)).toThrow();
    expect(() => updateChaosFate(EMPTY_CHAOS_FATE, 'award', 0)).toThrow();
    expect(() => updateChaosFate(EMPTY_CHAOS_FATE, 'award', 1.5)).toThrow();
  });
});
describe('offline bestiary', () => {
  test('has 334 CC BY 4.0 SRD monsters including 87 beasts with true stats', () => {
    const verified = MONSTER_DATABASE.filter(creature => creature.source === 'srd-5.1');
    expect(verified).toHaveLength(334);
    expect(verified.filter(creature => creature.type === 'beast')).toHaveLength(87);
    const veteran = verified.find(creature => creature.name === 'Veteran');
    expect(veteran).toMatchObject({ cr: '3', hp: 58, ac: 17 });
    expect(veteran.actions.some(action => action.name === 'Longsword')).toBe(true);
  });
});
