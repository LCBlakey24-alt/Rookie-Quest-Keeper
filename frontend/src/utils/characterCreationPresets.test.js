import {
  abilityFocusForClass,
  buildBasicCreatorPreset,
  buildRookCreatorPreset,
  openFullCreatorWithPreset,
  safeBackground,
  safeCharacterClass,
  safeRace,
} from './characterCreationPresets';

describe('characterCreationPresets helpers', () => {
  test('falls back to safe rule names', () => {
    expect(safeCharacterClass('Laser Knight')).toBe('Fighter');
    expect(safeRace('Robot')).toBe('Human');
    expect(safeBackground('Astronaut')).toBe('Soldier');
  });

  test('keeps valid rule names and class ability focus', () => {
    expect(safeCharacterClass('Wizard')).toBe('Wizard');
    expect(safeRace('Elf')).toBe('Elf');
    expect(safeBackground('Sage')).toBe('Sage');
    expect(abilityFocusForClass('Wizard')).toBe('intelligence');
  });

  test('builds a safe Basic Creator preset', () => {
    expect(buildBasicCreatorPreset({
      name: 'Rook',
      characterClass: 'Wizard',
      race: 'Elf',
      background: 'Sage',
      abilityFocus: 'intelligence',
      equipmentMode: 'recommended',
      magicPreference: 'I want magic',
    })).toMatchObject({
      source: 'basic-creator',
      name: 'Rook',
      characterClass: 'Wizard',
      race: 'Elf',
      background: 'Sage',
      abilityFocus: 'intelligence',
      equipmentMode: 'recommended',
    });
  });

  test('builds a safe Rook Matchmaker preset', () => {
    expect(buildRookCreatorPreset({
      suggestedClass: 'Warlock',
      race: 'Tiefling',
      background: 'Entertainer',
      title: 'The Silver-Tongued Schemer',
    }, 'I want a charming chaos character')).toMatchObject({
      source: 'rook-matchmaker',
      characterClass: 'Warlock',
      race: 'Tiefling',
      background: 'Entertainer',
      abilityFocus: 'charisma',
    });
  });

  test('opens Full Creator with route state', () => {
    const navigate = jest.fn();
    const preset = { source: 'basic-creator', characterClass: 'Fighter' };

    openFullCreatorWithPreset(navigate, preset);

    expect(navigate).toHaveBeenCalledWith('/characters/new/full', {
      state: { creatorPreset: preset },
    });
  });
});
