import {
  levelUpHpMath,
  progressionHistoryEntries,
  resourceChangeText,
  spellSlotChangeText,
} from './cleanSheetProgressionHistory';

describe('cleanSheetProgressionHistory', () => {
  test('sorts progression receipts newest first and exposes stored math', () => {
    const entries = progressionHistoryEntries({
      character_class: 'Fighter',
      level_progression: {
        2: {
          class: 'Fighter',
          class_level: 2,
          hp_gained: 8,
        },
        3: {
          class: 'Fighter',
          class_level: 3,
          receipt: {
            class: 'Fighter',
            total_level_before: 2,
            total_level_after: 3,
            hp: {
              method: 'manual',
              raw_roll: 7,
              constitution_modifier: 2,
              gained: 9,
              max_before: 20,
              max_after: 29,
            },
            proficiency: { before: 2, after: 2 },
            spell_slots: { before: {}, after: {} },
            resource_changes: [],
          },
        },
      },
    });

    expect(entries.map(entry => entry.level)).toEqual([3, 2]);
    expect(levelUpHpMath(entries[0])).toBe('Physical roll: 7 +2 CON = +9 HP');
    expect(entries[0].hp.maxBefore).toBe(20);
    expect(entries[0].hp.maxAfter).toBe(29);
  });

  test('formats slot and resource changes without inventing unchanged values', () => {
    expect(spellSlotChangeText(
      { 1: 3, 2: 2 },
      { 1: 4, 2: 2, 3: 2 },
    )).toBe('L1 3→4 • L3 0→2');

    expect(resourceChangeText({
      label: 'Action Surge',
      before_max: 0,
      after_max: 1,
      after_current: 1,
      unlocked: true,
    })).toBe('Action Surge unlocked at 1/1');

    expect(resourceChangeText({
      label: 'Ki',
      before_max: 4,
      after_max: 5,
      before_current: 1,
      after_current: 2,
    })).toBe('Ki max 4→5 • remaining 1→2');
  });
});
