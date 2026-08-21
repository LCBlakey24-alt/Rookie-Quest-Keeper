import { normaliseClassForLevelOneDisplay } from './ClassStep';

describe('normaliseClassForLevelOneDisplay', () => {
  test('accepts Homebrew Workshop class field shapes without crashing', () => {
    const result = normaliseClassForLevelOneDisplay({
      saving_throw_proficiencies: ['intelligence', 'wisdom'],
      armorProf: ['Light armor'],
      weaponProf: ['Simple weapons'],
      equipment: ['Spellbook', 'Dagger'],
      features: [
        { level: 1, name: 'Temporal Spark', description: 'First-level feature' },
        { level: 2, name: 'Second Tick', description: 'Later feature' },
      ],
    });

    expect(result.savingThrows).toEqual(['intelligence', 'wisdom']);
    expect(result.armorProficiencies).toEqual(['Light armor']);
    expect(result.weaponProficiencies).toEqual(['Simple weapons']);
    expect(result.startingEquipment).toEqual(['Spellbook', 'Dagger']);
    expect(result.levelOneFeatures).toEqual(['Temporal Spark']);
  });

  test('keeps the built-in class data shape working', () => {
    const result = normaliseClassForLevelOneDisplay({
      savingThrows: ['strength', 'constitution'],
      armorProficiencies: ['All armor'],
      weaponProficiencies: ['Martial weapons'],
      startingEquipment: ['Chain mail'],
      features: { 1: ['Second Wind', 'Fighting Style'] },
    });

    expect(result.savingThrows).toEqual(['strength', 'constitution']);
    expect(result.armorProficiencies).toEqual(['All armor']);
    expect(result.weaponProficiencies).toEqual(['Martial weapons']);
    expect(result.startingEquipment).toEqual(['Chain mail']);
    expect(result.levelOneFeatures).toEqual(['Second Wind', 'Fighting Style']);
  });
});
