import {
  buildLongRestUpdates,
  buildShortRestUpdates,
  getLongRestHitDiceRemaining,
  getTotalHitDice,
  restoreResourceTrackers,
} from './characterRestRules';

describe('character rest state helpers', () => {
  test('2014 long rest regains half total Hit Dice with a minimum of one', () => {
    expect(getLongRestHitDiceRemaining({
      rules_edition: '2014',
      level: 7,
      hit_dice_remaining: 1,
    })).toBe(4);

    expect(getLongRestHitDiceRemaining({
      rules_edition: '2014',
      level: 1,
      hit_dice_remaining: 0,
    })).toBe(1);
  });

  test('2024 long rest restores all Hit Dice', () => {
    expect(getLongRestHitDiceRemaining({
      ruleset_id: 'dnd5e_2024',
      level: 9,
      hit_dice_remaining: 2,
    })).toBe(9);
  });

  test('multiclass total Hit Dice follows summed class levels', () => {
    expect(getTotalHitDice({
      level: 8,
      class_levels: { Fighter: 5, Wizard: 3 },
    })).toBe(8);
  });

  test('short rest restores short-rest resources only', () => {
    expect(restoreResourceTrackers({
      action_surge: { current: 0, remaining: 0, max: 1, restore: 'short-rest' },
      sorcery_points: { current: 1, remaining: 1, max: 5, restore: 'long-rest' },
    }, 'short-rest')).toEqual({
      action_surge: { current: 1, remaining: 1, max: 1, restore: 'short-rest' },
      sorcery_points: { current: 1, remaining: 1, max: 5, restore: 'long-rest' },
    });
  });

  test('long rest resets combat state, slots, resources and one exhaustion level', () => {
    const updates = buildLongRestUpdates({
      character_class: 'Wizard',
      class_levels: { Wizard: 5 },
      rules_edition: '2014',
      level: 5,
      max_hit_points: 34,
      current_hit_points: 4,
      temporary_hit_points: 7,
      hit_dice_remaining: 1,
      exhaustion_level: 2,
      concentrating_on: 'Fly',
      spell_slots: { 1: 4, 2: 3, 3: 2 },
      spell_slots_remaining: { 1: 0, 2: 1, 3: 0 },
      resources: {
        arcane_recovery: { current: 0, remaining: 0, max: 1, restore: 'long-rest' },
      },
    });

    expect(updates).toMatchObject({
      current_hit_points: 34,
      temporary_hit_points: 0,
      temp_hp: 0,
      death_saves_successes: 0,
      death_saves_failures: 0,
      concentrating_on: null,
      concentration: null,
      spell_slots_remaining: { 1: 4, 2: 3, 3: 2 },
      hit_dice_remaining: 3,
      exhaustion_level: 1,
      last_rest_type: 'long-rest',
    });
    expect(updates.resources.arcane_recovery.current).toBe(1);
  });

  test('short rest restores Pact Magic tracker without refilling normal multiclass slots', () => {
    const updates = buildShortRestUpdates({
      character_class: 'Warlock',
      class_levels: { Warlock: 3, Wizard: 2 },
      level: 5,
      spell_slots: { 1: 3 },
      spell_slots_remaining: { 1: 1 },
      resources: {
        pact_magic: {
          current: 0,
          remaining: 0,
          max: 2,
          slot_level: 2,
          restore: 'short-rest',
        },
      },
    });

    expect(updates.resources.pact_magic.current).toBe(2);
    expect(updates.spell_slots_remaining).toBeUndefined();
  });

  test('legacy Warlock short rest migrates and restores legacy pact slot state', () => {
    const updates = buildShortRestUpdates({
      character_class: 'Warlock',
      class_levels: { Warlock: 5 },
      level: 5,
      spell_slots: { 3: 2 },
      spell_slots_remaining: { 3: 0 },
      resources: {},
    });

    expect(updates.spell_slots_remaining).toEqual({ 3: 2 });
    expect(updates.resources.pact_magic).toMatchObject({
      current: 2,
      remaining: 2,
      max: 2,
      slot_level: 3,
      restore: 'short-rest',
    });
  });
});
