import {
  buildCharacterProfileDraft,
  buildCharacterProfilePatch,
  characterClassSummary,
  protectedStateSummary,
} from './characterProfileEdit';

describe('safe character profile editing', () => {
  test('draft hydrates player-authored profile fields from saved aliases', () => {
    expect(buildCharacterProfileDraft({
      name: 'Javen',
      alignment: 'Neutral Good',
      personality_traits: 'Quietly protective',
      ideals: 'Freedom',
      bonds: 'The party',
      flaws: 'Too trusting',
      backstory: 'A long road.',
      appearance: 'Dark travelling clothes',
      portrait_url: 'https://example.com/javen.png',
      notes: 'Ask about the crown.',
    })).toEqual({
      name: 'Javen',
      alignment: 'Neutral Good',
      personalityTrait: 'Quietly protective',
      ideal: 'Freedom',
      bond: 'The party',
      flaw: 'Too trusting',
      backstory: 'A long road.',
      appearance: 'Dark travelling clothes',
      portraitUrl: 'https://example.com/javen.png',
      notes: 'Ask about the crown.',
    });
  });

  test('profile patch never includes progression or live adventuring state', () => {
    const patch = buildCharacterProfilePatch({
      name: '  Javen Crow  ',
      alignment: 'Chaotic Good',
      personalityTrait: 'Protective',
      ideal: 'Choice',
      bond: 'Family',
      flaw: 'Reckless',
      backstory: 'Updated story',
      appearance: 'Updated look',
      portraitUrl: ' https://example.com/new.png ',
      notes: 'Player note',
      level: 20,
      character_class: 'Wizard',
      current_hit_points: 999,
      max_hit_points: 999,
      hit_dice_remaining: 20,
      spell_slots_remaining: { 9: 99 },
      resources: { rage: { current: 99 } },
      inventory: [{ name: 'Do not overwrite me' }],
      conditions: [],
    });

    expect(patch).toEqual({
      name: 'Javen Crow',
      alignment: 'Chaotic Good',
      portrait_url: 'https://example.com/new.png',
      personality_trait: 'Protective',
      personality_traits: 'Protective',
      ideal: 'Choice',
      ideals: 'Choice',
      bond: 'Family',
      bonds: 'Family',
      flaw: 'Reckless',
      flaws: 'Reckless',
      backstory: 'Updated story',
      appearance: 'Updated look',
      notes: 'Player note',
    });
    expect(patch).not.toHaveProperty('level');
    expect(patch).not.toHaveProperty('current_hit_points');
    expect(patch).not.toHaveProperty('spell_slots_remaining');
    expect(patch).not.toHaveProperty('resources');
    expect(patch).not.toHaveProperty('inventory');
  });

  test('class summary keeps multiclass levels visible without changing them', () => {
    expect(characterClassSummary({
      level: 8,
      character_class: 'Warlock',
      class_levels: { Warlock: 5, Fighter: 3 },
    })).toBe('Warlock 5 / Fighter 3');
  });

  test('protected summary reports live state for reassurance cards', () => {
    expect(protectedStateSummary({
      level: 8,
      character_class: 'Fighter',
      current_hit_points: 31,
      max_hit_points: 52,
      armor_class: 17,
      inventory: [{ name: 'Sword' }, { name: 'Potion' }],
      resources: { second_wind: {}, action_surge: {} },
      spell_slots: { 1: 4, 2: 2 },
    })).toMatchObject({
      level: 8,
      currentHp: 31,
      maxHp: 52,
      armorClass: 17,
      inventoryCount: 2,
      resourceCount: 2,
      spellSlotLevels: 2,
    });
  });
});
