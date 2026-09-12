import { canonicalisePreviewCreatedCharacter, parseClassBreakdown } from './previewCharacterCreation';

describe('preview character creation state', () => {
  test('parses imported multiclass text into real class levels', () => {
    expect(parseClassBreakdown('Fighter 3 / Rogue 2', 5)).toEqual({
      primaryClass: 'Fighter',
      classLevels: { Fighter: 3, Rogue: 2 },
      explicit: true,
    });
  });

  test('single-class builder payload becomes immediately playable', () => {
    const character = canonicalisePreviewCreatedCharacter({
      name: 'Rook',
      race: 'Human',
      character_class: 'Fighter',
      subclass: 'Champion',
      level: 2,
      edition: '2014',
      strength: 16,
      constitution: 14,
    });

    expect(character.class_levels).toEqual({ Fighter: 2 });
    expect(character.classes).toEqual([{ name: 'Fighter', level: 2, subclass: 'Champion' }]);
    expect(character.hit_dice).toBe('2d10');
    expect(character.hit_dice_remaining).toBe(2);
    expect(character.proficiency_bonus).toBe(2);
    expect(character.resources.second_wind).toMatchObject({ max: 1, current: 1 });
    expect(character.resources.action_surge).toMatchObject({ max: 1, current: 1 });
  });

  test('imported multiclass character gets shared caster slots and per-class dice', () => {
    const character = canonicalisePreviewCreatedCharacter({
      name: 'Dual Caster',
      race: 'Human',
      character_class: 'Wizard 3 / Cleric 2',
      level: 5,
      edition: '2014',
      intelligence: 16,
      wisdom: 16,
    });

    expect(character.character_class).toBe('Wizard');
    expect(character.level).toBe(5);
    expect(character.class_levels).toEqual({ Wizard: 3, Cleric: 2 });
    expect(character.hit_dice).toContain('5d6');
    expect(character.spell_slots).toEqual({ 1: 4, 2: 3, 3: 2 });
    expect(character.spell_slots_remaining).toEqual({ 1: 4, 2: 3, 3: 2 });
    expect(character.resources.channel_divinity_cleric).toMatchObject({ max: 1, current: 1 });
  });

  test('warlock creation exposes pact slots and a short-rest tracker', () => {
    const character = canonicalisePreviewCreatedCharacter({
      name: 'Javen',
      race: 'Human',
      character_class: 'Warlock 11',
      level: 11,
      edition: '2014',
      charisma: 18,
    });

    expect(character.character_class).toBe('Warlock');
    expect(character.spell_slots).toEqual({ 5: 3 });
    expect(character.spell_slots_remaining).toEqual({ 5: 3 });
    expect(character.resources.pact_magic).toMatchObject({
      max: 3,
      current: 3,
      slot_level: 5,
      restore: 'short-rest',
    });
    expect(character.spellcasting_ability).toBe('charisma');
    expect(character.spell_save_dc).toBe(16);
    expect(character.spell_attack_bonus).toBe(8);
  });

  test('homebrew multiclass keeps explicitly supplied spell slots', () => {
    const character = canonicalisePreviewCreatedCharacter({
      name: 'Homebrew Hybrid',
      race: 'Human',
      character_class: 'Scarlet Engineer 3 / Void Knight 2',
      level: 5,
      spell_slots: { 1: 2, 2: 1 },
      spell_slots_remaining: { 1: 1, 2: 1 },
    });

    expect(character.class_levels).toEqual({ 'Scarlet Engineer': 3, 'Void Knight': 2 });
    expect(character.spell_slots).toEqual({ 1: 2, 2: 1 });
    expect(character.spell_slots_remaining).toEqual({ 1: 1, 2: 1 });
  });
});
