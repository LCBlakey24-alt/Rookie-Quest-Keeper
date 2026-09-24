import {
  buildHomebrewSpellcastingState,
  getHomebrewLevelOneSpellRequirements,
  getHomebrewSpellSlots,
  homebrewSpellcastingIsActive,
  normaliseHomebrewClassSpellcasting,
} from './homebrewClassSpellcasting';

describe('homebrew class spellcasting', () => {
  const fullCaster = {
    spellcasting: {
      ability: 'intelligence',
      type: 'known',
      progression: 'full',
      start_level: 1,
      cantrips_level_1: 2,
      spells_level_1: 3,
      ritual: true,
    },
  };

  test('normalises creator-facing spellcasting metadata', () => {
    expect(normaliseHomebrewClassSpellcasting(fullCaster)).toMatchObject({
      ability: 'intelligence',
      type: 'known',
      progression: 'full',
      startLevel: 1,
      cantripsAtLevelOne: 2,
      spellsAtLevelOne: 3,
      ritual: true,
      homebrew: true,
    });
  });

  test('exposes configured level-one spell choices without inventing counts', () => {
    expect(getHomebrewLevelOneSpellRequirements(fullCaster)).toEqual({
      cantrips: 2,
      spells: 3,
      type: 'known',
    });
    expect(getHomebrewLevelOneSpellRequirements({
      spellcasting: { ability: 'wisdom', progression: 'full', start_level: 2 },
    })).toEqual({ cantrips: 0, spells: 0, type: 'none' });
  });

  test('accepts legacy caster flags and friendly progression labels', () => {
    expect(normaliseHomebrewClassSpellcasting({
      spellcasting: { ability: 'wisdom', halfCaster: true },
    }).progression).toBe('half');

    expect(normaliseHomebrewClassSpellcasting({
      spellcasting: { ability: 'charisma', progression: 'Pact Magic' },
    }).progression).toBe('pact');
  });

  test('uses full-caster slot progression after the configured start level', () => {
    expect(getHomebrewSpellSlots(fullCaster, 5, '2014')).toEqual({
      1: 4,
      2: 3,
      3: 2,
    });
  });

  test('uses edition-aware half-caster slot progression', () => {
    const halfCaster = {
      spellcasting: { ability: 'wisdom', progression: 'half', start_level: 1 },
    };

    expect(getHomebrewSpellSlots(halfCaster, 1, '2014')).toEqual({});
    expect(getHomebrewSpellSlots(halfCaster, 1, '2024')).toEqual({ 1: 2 });
  });

  test('stores pact progression as the normal spell-slot map shape', () => {
    const pactCaster = {
      spellcasting: { ability: 'charisma', progression: 'pact', start_level: 1 },
    };

    expect(getHomebrewSpellSlots(pactCaster, 5, '2014')).toEqual({ 3: 2 });
  });

  test('respects a delayed spellcasting start', () => {
    const delayed = {
      spellcasting: { ability: 'intelligence', progression: 'third', start_level: 3 },
    };

    expect(homebrewSpellcastingIsActive(delayed, 2)).toBe(false);
    expect(homebrewSpellcastingIsActive(delayed, 3)).toBe(true);
  });

  test('builds save-ready ability math and slots', () => {
    expect(buildHomebrewSpellcastingState(fullCaster, {
      level: 1,
      edition: '2014',
      scores: { intelligence: 16 },
      proficiencyBonus: 2,
    })).toEqual({
      spell_slots: { 1: 2 },
      spell_slots_remaining: { 1: 2 },
      spellcasting_ability: 'intelligence',
      spell_save_dc: 13,
      spell_attack_bonus: 5,
    });
  });
});
