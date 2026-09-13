import {
  buildLongRestUpdates,
  buildShortRestUpdates,
  canonicalResourcesForRest,
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

  test('2024-style trackers regain one use per Short Rest instead of fully refilling', () => {
    const first = restoreResourceTrackers({
      second_wind: { current: 0, remaining: 0, max: 4, restore: 'long-rest', short_rest_restore: 1 },
      channel_divinity: { current: 1, remaining: 1, max: 4, restore: 'long-rest', short_rest_restore: 1 },
      wild_shape: { current: 2, remaining: 2, max: 4, restore: 'long-rest', short_rest_restore: 1 },
    }, 'short-rest');

    expect(first.second_wind).toMatchObject({ current: 1, remaining: 1, max: 4 });
    expect(first.channel_divinity).toMatchObject({ current: 2, remaining: 2, max: 4 });
    expect(first.wild_shape).toMatchObject({ current: 3, remaining: 3, max: 4 });

    const second = restoreResourceTrackers(first, 'short-rest');
    expect(second.second_wind.current).toBe(2);
    expect(second.channel_divinity.current).toBe(3);
    expect(second.wild_shape.current).toBe(4);
  });

  test('preview rest reconciliation repairs stale core resource maxima', () => {
    const repaired = canonicalResourcesForRest({
      character_class: 'Fighter',
      level: 10,
      rules_edition: '2024',
      class_levels: { Fighter: 10 },
      resources: {
        second_wind: { current: 0, remaining: 0, max: 3, restore: 'long-rest' },
        custom_charge: { current: 2, remaining: 2, max: 2, restore: 'long-rest' },
      },
    });

    expect(repaired.second_wind).toMatchObject({
      current: 1,
      remaining: 1,
      max: 4,
      restore: 'long-rest',
      short_rest_restore: 1,
    });
    expect(repaired.custom_charge).toMatchObject({ current: 2, max: 2 });
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

    expect(updates.spell_slots).toEqual({ 3: 2 });
    expect(updates.spell_slots_remaining).toEqual({ 3: 2 });
    expect(updates.resources.pact_magic).toMatchObject({
      current: 2,
      remaining: 2,
      max: 2,
      slot_level: 3,
      restore: 'short-rest',
    });
  });

  test('stale high-level Warlock legacy slot mirror is repaired on rest', () => {
    const updates = buildShortRestUpdates({
      character_class: 'Warlock',
      class_levels: { Warlock: 17 },
      level: 17,
      spell_slots: { 4: 2 },
      spell_slots_remaining: { 4: 0 },
      resources: {
        pact_magic: { current: 0, remaining: 0, max: 2, slot_level: 4, restore: 'short-rest' },
      },
    });

    expect(updates.resources.pact_magic).toMatchObject({
      current: 4,
      remaining: 4,
      max: 4,
      slot_level: 5,
    });
    expect(updates.spell_slots).toEqual({ 5: 4 });
    expect(updates.spell_slots_remaining).toEqual({ 5: 4 });
  });
});
