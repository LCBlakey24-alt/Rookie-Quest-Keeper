import {
  canCastSpellWithSlot,
  findSlotPoolingCombos,
  getAllowedSlotLevelsForSpell,
  getAvailableCastSlotLevels,
  spendSpellSlot,
} from './spellCastingRules';

describe('spell casting rules helpers', () => {
  test('cantrips do not use spell slots', () => {
    expect(getAllowedSlotLevelsForSpell({ name: 'Fire Bolt', level: 0 })).toEqual([0]);
    expect(canCastSpellWithSlot({ spell: { name: 'Fire Bolt', level: 0 }, slotLevel: 0 })).toBe(true);
    expect(canCastSpellWithSlot({ spell: { name: 'Fire Bolt', level: 0 }, slotLevel: 1 })).toBe(false);
  });

  test('levelled spells default to exact-level casting only', () => {
    const spell = { name: 'Shield', level: 1 };

    expect(getAllowedSlotLevelsForSpell(spell)).toEqual([1]);
    expect(canCastSpellWithSlot({ spell, slotLevel: 1 })).toBe(true);
    expect(canCastSpellWithSlot({ spell, slotLevel: 2 })).toBe(false);
  });

  test('explicit upcast metadata controls allowed slot levels', () => {
    const spell = { name: 'Custom Rift', level: 1, allowed_slot_levels: [1, 4, 6] };

    expect(getAllowedSlotLevelsForSpell(spell)).toEqual([1, 4, 6]);
    expect(canCastSpellWithSlot({ spell, slotLevel: 4 })).toBe(true);
    expect(canCastSpellWithSlot({ spell, slotLevel: 2 })).toBe(false);
  });

  test('available slot levels only include allowed levels with remaining slots', () => {
    const spell = { name: 'Custom Rift', level: 1, allowed_slot_levels: [1, 4, 6] };

    expect(getAvailableCastSlotLevels({
      spell,
      slots: { 1: 4, 4: 1, 6: 1 },
      remaining: { 1: 0, 4: 1, 6: 0 },
    })).toEqual([4]);
  });

  test('spending a spell slot only spends the chosen level', () => {
    expect(spendSpellSlot({ remaining: { 1: 2, 2: 1 }, slotLevel: 2 })).toEqual({ 1: 2, 2: 0 });
  });

  test('slot pooling helper finds lower-slot combinations for a GM homebrew toggle', () => {
    expect(findSlotPoolingCombos({ requiredLevel: 3, remaining: { 1: 3, 2: 1, 3: 0 } })).toEqual([
      [2, 1],
      [1, 1, 1],
    ]);
  });
});
