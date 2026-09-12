import { isPreviewFullBuilderEdit, stateSafePreviewBuilderEdit } from './previewCharacterEdit';

describe('preview full-builder edit safety', () => {
  test('detects only creation-style full builder patches', () => {
    expect(isPreviewFullBuilderEdit({ creation_mode: 'full' })).toBe(true);
    expect(isPreviewFullBuilderEdit({ creation_mode: ' FULL ' })).toBe(true);
    expect(isPreviewFullBuilderEdit({ creation_mode: 'imported' })).toBe(false);
  });

  test('higher-level edit keeps profile changes but drops adventuring resets', () => {
    const existing = {
      level: 8,
      character_class: 'Warlock',
      class_levels: { Warlock: 8 },
      current_hit_points: 19,
      max_hit_points: 52,
      resources: { pact_magic: { current: 0, max: 2 } },
    };
    const update = stateSafePreviewBuilderEdit(existing, {
      creation_mode: 'full',
      name: 'Javen Crow',
      charisma: 18,
      backstory: 'Updated story',
      level: 1,
      character_class: 'Fighter',
      current_hit_points: 12,
      max_hit_points: 12,
      hit_dice_remaining: 1,
      spell_slots_remaining: {},
      resources: {},
      conditions: [],
      inventory: [{ name: 'Starter sword' }],
      currency: { gold: 0 },
    });

    expect(update).toEqual({
      name: 'Javen Crow',
      charisma: 18,
      backstory: 'Updated story',
    });
  });

  test('level-one single class may correct class and spell choices without refilling counters', () => {
    const update = stateSafePreviewBuilderEdit({
      level: 1,
      character_class: 'Fighter',
      class_levels: { Fighter: 1 },
    }, {
      creation_mode: 'full',
      character_class: 'Wizard',
      edition: '2014',
      spellcasting_ability: 'intelligence',
      spell_slots: { 1: 2 },
      spell_slots_remaining: { 1: 2 },
      spells_known: [{ name: 'Magic Missile' }],
      current_hit_points: 8,
      hit_dice_remaining: 1,
      resources: { arcane_recovery: { current: 1, max: 1 } },
    });

    expect(update.character_class).toBe('Wizard');
    expect(update.spell_slots).toEqual({ 1: 2 });
    expect(update.spells_known).toEqual([{ name: 'Magic Missile' }]);
    expect(update.spell_slots_remaining).toBeUndefined();
    expect(update.current_hit_points).toBeUndefined();
    expect(update.hit_dice_remaining).toBeUndefined();
    expect(update.resources).toBeUndefined();
  });

  test('multiclass character never allows a creation-style structural collapse', () => {
    const update = stateSafePreviewBuilderEdit({
      level: 6,
      character_class: 'Fighter',
      class_levels: { Fighter: 3, Wizard: 3 },
    }, {
      creation_mode: 'full',
      name: 'Hero',
      character_class: 'Wizard',
      subclass: 'Evocation',
      class_features: [],
      feats: [],
    });

    expect(update).toEqual({ name: 'Hero' });
  });
});
