import { CORE_CLASS_NAMES, deriveCharacterSnapshot, getSupportedRaceNames } from './deriveCharacterSnapshot';

const baseCharacter = (overrides = {}) => ({
  name: 'Audit Hero',
  character_class: 'Fighter',
  race: 'Human',
  background: 'Soldier',
  level: 1,
  strength: 14,
  dexterity: 14,
  constitution: 14,
  intelligence: 12,
  wisdom: 12,
  charisma: 12,
  ...overrides,
});

describe('deriveCharacterSnapshot', () => {
  test.each(CORE_CLASS_NAMES)('derives a playable level 1 and level 20 snapshot for %s', (className) => {
    const levelOne = deriveCharacterSnapshot(baseCharacter({ character_class: className, level: 1 }));
    expect(levelOne.identity.primaryClass).toBe(className);
    expect(levelOne.identity.classLevels[className]).toBe(1);
    expect(levelOne.features.length).toBeGreaterThan(0);
    expect(levelOne.proficiencyBonus).toBe(2);

    const levelTwenty = deriveCharacterSnapshot(baseCharacter({ character_class: className, level: 20 }));
    expect(levelTwenty.identity.classLevels[className]).toBe(20);
    expect(levelTwenty.proficiencyBonus).toBe(6);
    expect(levelTwenty.features.length).toBeGreaterThanOrEqual(levelOne.features.length);
  });

  test.each(['2014', '2024'])('derives supported %s race/species basics', (edition) => {
    getSupportedRaceNames(edition).forEach((race) => {
      const snapshot = deriveCharacterSnapshot(baseCharacter({ race, species: race, rules_edition: edition }));
      expect(snapshot.race.name).toBe(race);
      expect(snapshot.race.found).toBe(true);
      expect(snapshot.race.speed).toBeGreaterThan(0);
      expect(snapshot.race.size).toBeTruthy();
      expect(Array.isArray(snapshot.race.traits)).toBe(true);
    });
  });

  test('derives starter Dragonborn without relying on side-effect data mutation', () => {
    const snapshot = deriveCharacterSnapshot(baseCharacter({ race: 'Dragonborn', species: 'Dragonborn', rules_edition: '2024' }));
    expect(snapshot.race.name).toBe('Dragonborn');
    expect(snapshot.race.found).toBe(true);
    expect(snapshot.race.speed).toBeGreaterThan(0);
    expect(snapshot.race.size).toBeTruthy();
    expect(Array.isArray(snapshot.race.traits)).toBe(true);
    expect(snapshot.warnings.join(' ')).not.toMatch(/2014 ability-score data/);
  });

  test('derives Monk resource and bonus action cards from the canonical snapshot', () => {
    const snapshot = deriveCharacterSnapshot(baseCharacter({ character_class: 'Monk', level: 6, subclass: 'Way of the Open Hand' }));
    expect(snapshot.resources.find(resource => resource.key === 'ki')).toMatchObject({ max: 6 });
    expect(snapshot.actionEconomy.bonusActions.map(card => card.title)).toEqual(expect.arrayContaining(['Flurry of Blows', 'Patient Defense', 'Step of the Wind']));
  });

  test('derives spellcasting blocks for full, half, pact, and subclass casters', () => {
    expect(deriveCharacterSnapshot(baseCharacter({ character_class: 'Wizard', level: 5 })).spellcasting.blocks[0]).toMatchObject({ className: 'Wizard', type: 'prepared' });
    expect(deriveCharacterSnapshot(baseCharacter({ character_class: 'Paladin', level: 2 })).spellcasting.blocks[0]).toMatchObject({ className: 'Paladin', type: 'prepared' });
    expect(deriveCharacterSnapshot(baseCharacter({ character_class: 'Warlock', level: 2 })).spellcasting.blocks[0]).toMatchObject({ className: 'Warlock', type: 'pact_magic' });
    expect(deriveCharacterSnapshot(baseCharacter({ character_class: 'Fighter', level: 3, subclass: 'Eldritch Knight' })).spellcasting.blocks[0]).toMatchObject({ className: 'Fighter', type: 'known' });
  });
});
