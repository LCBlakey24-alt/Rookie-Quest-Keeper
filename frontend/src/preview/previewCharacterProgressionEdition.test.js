import {
  applyPreviewCharacterLevelUp,
  getPreviewLevelUpOptions,
} from './previewCharacterProgression';

describe('preview progression edition-aware spellcasting', () => {
  test('2024 Wizard/Paladin multiclass rounds the Paladin contribution up', () => {
    const character = {
      id: 'modern-hybrid',
      name: 'Modern Hybrid',
      character_class: 'Wizard',
      level: 2,
      rules_edition: '2024',
      class_levels: { Wizard: 1, Paladin: 1 },
      classes: [
        { name: 'Wizard', level: 1, subclass: '' },
        { name: 'Paladin', level: 1, subclass: '' },
      ],
      constitution: 12,
      max_hit_points: 16,
      current_hit_points: 12,
      spell_slots: { 1: 3 },
      spell_slots_remaining: { 1: 1 },
    };

    const options = getPreviewLevelUpOptions(character, { targetClass: 'Wizard' });
    expect(options.previous_spell_slots).toEqual({ 1: 3 });
    expect(options.spell_slots).toEqual({ 1: 4, 2: 2 });
  });

  test('2014 Wizard/Paladin multiclass rounds the Paladin contribution down', () => {
    const character = {
      id: 'legacy-hybrid',
      name: 'Legacy Hybrid',
      character_class: 'Wizard',
      level: 2,
      rules_edition: '2014',
      class_levels: { Wizard: 1, Paladin: 1 },
      classes: [
        { name: 'Wizard', level: 1, subclass: '' },
        { name: 'Paladin', level: 1, subclass: '' },
      ],
    };

    const options = getPreviewLevelUpOptions(character, { targetClass: 'Wizard' });
    expect(options.previous_spell_slots).toEqual({ 1: 2 });
    expect(options.spell_slots).toEqual({ 1: 3 });
  });

  test('2024 Ranger preflight does not leak the 2014 known-spell table', () => {
    const options = getPreviewLevelUpOptions({
      id: 'modern-ranger',
      name: 'Trail',
      character_class: 'Ranger',
      level: 1,
      rules_edition: '2024',
      class_levels: { Ranger: 1 },
      classes: [{ name: 'Ranger', level: 1, subclass: '' }],
    }, { targetClass: 'Ranger' });

    expect(options.class_level_after).toBe(2);
    expect(options.spells_to_learn).toBe(0);
  });

  test('2014 Ranger still gains its level-two known spells', () => {
    const options = getPreviewLevelUpOptions({
      id: 'legacy-ranger',
      name: 'Trail',
      character_class: 'Ranger',
      level: 1,
      rules_edition: '2014',
      class_levels: { Ranger: 1 },
      classes: [{ name: 'Ranger', level: 1, subclass: '' }],
    }, { targetClass: 'Ranger' });

    expect(options.spells_to_learn).toBe(2);
  });

  test('2024 Paladin multiclass level one immediately contributes ordinary slots', () => {
    const updated = applyPreviewCharacterLevelUp({
      character_class: 'Wizard',
      level: 1,
      rules_edition: '2024',
      intelligence: 16,
      charisma: 16,
      constitution: 12,
      max_hit_points: 8,
      current_hit_points: 5,
      hit_dice_remaining: 0,
      class_levels: { Wizard: 1 },
      spell_slots: { 1: 2 },
      spell_slots_remaining: { 1: 1 },
    }, {
      new_level: 2,
      new_class: 'Paladin',
      hp_method: 'average',
    }, { multiclass: true });

    expect(updated.class_levels).toEqual({ Wizard: 1, Paladin: 1 });
    expect(updated.spell_slots).toEqual({ 1: 3 });
    // One Wizard slot was spent before levelling; the newly gained capacity is
    // usable, but levelling does not restore the spent slot.
    expect(updated.spell_slots_remaining).toEqual({ 1: 2 });
  });
});
