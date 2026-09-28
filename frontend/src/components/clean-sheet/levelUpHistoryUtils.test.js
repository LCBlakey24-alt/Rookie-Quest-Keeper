import {
  asiChangeText,
  levelUpHpMath,
  progressionHistoryEntries,
  resourceChangeText,
  spellSlotChangeText,
} from './levelUpHistoryUtils';

describe('levelUpHistoryUtils', () => {
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

  test('explains the minimum +1 HP floor for fixed average gains', () => {
    const entry = progressionHistoryEntries({
      level_progression: {
        2: {
          receipt: {
            class: 'Wizard',
            total_level_after: 2,
            hp: {
              method: 'average',
              fixed_die_value: 4,
              constitution_modifier: -4,
              gained: 1,
              max_before: 5,
              max_after: 6,
              minimum_one_applied: true,
            },
          },
        },
      },
    })[0];

    expect(levelUpHpMath(entry)).toBe('Fixed: 4 -4 CON = 0 → minimum +1 HP');
  });

  test('keeps legacy ASI ability names instead of rendering only the numeric amount', () => {
    const [entry] = progressionHistoryEntries({
      level_progression: {
        4: {
          type: 'asi',
          choices: { strength: 2, constitution: 1 },
        },
      },
    });

    expect(asiChangeText(entry.asiChanges)).toBe('STR +2, CON +1');
  });

  test('combines modern repeated ASI choices into one readable increase', () => {
    const [entry] = progressionHistoryEntries({
      level_progression: {
        4: {
          type: 'asi',
          asi_choices: { ability1: 'strength', ability2: 'strength' },
        },
      },
    });

    expect(asiChangeText(entry.asiChanges)).toBe('STR +2');
  });

  test('does not invent a primary class for an older progression record', () => {
    const [entry] = progressionHistoryEntries({
      character_class: 'Fighter',
      class_levels: { Fighter: 3, Wizard: 2 },
      level_progression: {
        5: { hp_gained: 6 },
      },
    });

    expect(entry.className).toBe('Class not recorded');
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
