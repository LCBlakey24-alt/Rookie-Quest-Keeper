import {
  applyPreviewCharacterLevelUp,
  getPreviewLevelUpOptions,
  normalisePreviewClassLevels,
} from './previewCharacterProgression';

describe('local preview character progression', () => {
  test('normalises legacy single-class characters into class-level maps', () => {
    expect(normalisePreviewClassLevels({ character_class: 'fighter', level: 4 })).toEqual({ Fighter: 4 });
  });

  test('preview options expose the next legal level and HP die', () => {
    const options = getPreviewLevelUpOptions({
      id: 'fighter-one',
      name: 'Rook',
      character_class: 'Fighter',
      level: 3,
      edition: '2014',
    });

    expect(options).toMatchObject({
      current_level: 3,
      target_level: 4,
      hit_die: 10,
      proficiency_bonus: 2,
      is_asi_level: true,
    });
  });

  test('level-up preserves damage and adds one usable hit die', () => {
    const updated = applyPreviewCharacterLevelUp({
      id: 'fighter-one',
      name: 'Rook',
      character_class: 'Fighter',
      level: 3,
      constitution: 14,
      max_hit_points: 30,
      current_hit_points: 11,
      hit_dice_remaining: 1,
      class_levels: { Fighter: 3 },
      spell_slots: {},
      spell_slots_remaining: {},
    }, {
      new_level: 4,
      hp_method: 'average',
    });

    // Fighter average d10 = 6, +2 CON = 8. Damage stays at 19.
    expect(updated.max_hit_points).toBe(38);
    expect(updated.current_hit_points).toBe(19);
    expect(updated.hit_dice_remaining).toBe(2);
    expect(updated.class_levels).toEqual({ Fighter: 4 });
  });

  test('ASI choices update ability scores without passing 20', () => {
    const updated = applyPreviewCharacterLevelUp({
      character_class: 'Fighter',
      level: 3,
      strength: 19,
      dexterity: 12,
      constitution: 10,
      max_hit_points: 24,
      current_hit_points: 24,
      class_levels: { Fighter: 3 },
    }, {
      new_level: 4,
      choice_type: 'asi',
      asi_choices: { ability1: 'strength', ability2: 'strength' },
      hp_method: 'average',
    });

    expect(updated.strength).toBe(20);
  });

  test('wizard level-up preserves already-spent normal slots while adding capacity', () => {
    const updated = applyPreviewCharacterLevelUp({
      character_class: 'Wizard',
      level: 2,
      intelligence: 16,
      constitution: 12,
      max_hit_points: 14,
      current_hit_points: 9,
      class_levels: { Wizard: 2 },
      spell_slots: { 1: 3 },
      spell_slots_remaining: { 1: 1 },
    }, {
      new_level: 3,
      hp_method: 'average',
    });

    expect(updated.spell_slots).toEqual({ 1: 4, 2: 2 });
    expect(updated.spell_slots_remaining).toEqual({ 1: 2, 2: 2 });
  });

  test('multiclass Wizard and Cleric use the shared caster slot table', () => {
    const updated = applyPreviewCharacterLevelUp({
      character_class: 'Wizard',
      level: 3,
      intelligence: 16,
      wisdom: 14,
      constitution: 12,
      max_hit_points: 20,
      current_hit_points: 20,
      class_levels: { Wizard: 3 },
      spell_slots: { 1: 4, 2: 2 },
      spell_slots_remaining: { 1: 3, 2: 1 },
    }, {
      new_level: 4,
      new_class: 'Cleric',
      hp_method: 'average',
    }, { multiclass: true });

    expect(updated.class_levels).toEqual({ Wizard: 3, Cleric: 1 });
    expect(updated.spell_slots).toEqual({ 1: 4, 2: 3 });
    expect(updated.spell_slots_remaining).toEqual({ 1: 3, 2: 2 });
  });

  test('adding Warlock creates a separate short-rest Pact Magic tracker', () => {
    const updated = applyPreviewCharacterLevelUp({
      character_class: 'Fighter',
      level: 3,
      charisma: 14,
      constitution: 12,
      max_hit_points: 28,
      current_hit_points: 28,
      class_levels: { Fighter: 3 },
      resources: {},
    }, {
      new_level: 4,
      new_class: 'Warlock',
      hp_method: 'average',
    }, { multiclass: true });

    expect(updated.class_levels).toEqual({ Fighter: 3, Warlock: 1 });
    expect(updated.resources.pact_magic).toMatchObject({
      current: 1,
      remaining: 1,
      max: 1,
      slot_level: 1,
      restore: 'short-rest',
    });
  });

  test('rejects attempts to skip levels', () => {
    expect(() => applyPreviewCharacterLevelUp({
      character_class: 'Fighter',
      level: 3,
      max_hit_points: 20,
      current_hit_points: 20,
    }, {
      new_level: 5,
      hp_method: 'average',
    })).toThrow('Can only level up from 3 to 4');
  });
});
