import { resourceAdjustUpdate, slotAdjustUpdate, spellSlotRows } from './spentResourceRestore';

const wizard = {
  character_class: 'Wizard', level: 5,
  spell_slots: { 1: 4, 2: 3, 3: 2 },
  spell_slots_remaining: { 1: 1, 2: 3, 3: 0 },
};

describe('giving back spent uses', () => {
  it('lists each slot level with what is left', () => {
    expect(spellSlotRows(wizard)).toEqual([
      { source: 'spell', level: 1, total: 4, left: 1 },
      { source: 'spell', level: 2, total: 3, left: 3 },
      { source: 'spell', level: 3, total: 2, left: 0 },
    ]);
  });

  it('gives one slot back at that level only, never above the maximum', () => {
    expect(slotAdjustUpdate(wizard, { source: 'spell', level: 3 }, 1)).toEqual({ spell_slots_remaining: { 1: 1, 2: 3, 3: 1 } });
    expect(slotAdjustUpdate(wizard, { source: 'spell', level: 2 }, 1)).toBeNull();
    expect(slotAdjustUpdate(wizard, { source: 'spell', level: 3 }, -1)).toBeNull();
  });

  it('gives back a Pact Magic slot on the warlock tracker', () => {
    const warlock = { character_class: 'Warlock', level: 5, resources: { pact_magic: { current: 0, max: 2, slot_level: 3 } } };
    const rows = spellSlotRows(warlock);
    expect(rows.find((row) => row.source === 'pact')).toMatchObject({ level: 3, total: 2, left: 0 });
    const updates = slotAdjustUpdate(warlock, { source: 'pact', level: 3 }, 1);
    expect(updates.resources.pact_magic).toMatchObject({ current: 1, remaining: 1, max: 2, slot_level: 3 });
  });

  it('moves a class resource within its limits and keeps its other fields', () => {
    const monk = { resources: { ki: { current: 2, max: 5, restore: 'short-rest', note: 'kept' } } };
    const ki = { key: 'ki', label: 'Ki', current: 2, max: 5, restore: 'short-rest' };
    const back = resourceAdjustUpdate(monk, ki, 1);
    expect(back.next).toBe(3);
    expect(back.updates.resources.ki).toMatchObject({ current: 3, remaining: 3, max: 5, note: 'kept' });
    expect(resourceAdjustUpdate(monk, { ...ki, current: 5 }, 1)).toBeNull();
  });
});
