import {
  getWarlockClassLevel,
  getWarlockClassLevelMap,
  hasWarlockClassLevel,
  isWarlockCharacter,
  normaliseWarlockClassName,
} from './warlockCharacterShape';

describe('Warlock character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseWarlockClassName('Warlock')).toBe('warlock');
    expect(normaliseWarlockClassName(' warlock ')).toBe('warlock');
    expect(normaliseWarlockClassName('Warlock / Patron')).toBe('warlock_patron');
  });

  test('detects direct Warlock class fields', () => {
    expect(isWarlockCharacter({ character_class: 'Warlock', level: 4 })).toBe(true);
    expect(isWarlockCharacter({ className: 'Warlock', level: 4 })).toBe(true);
    expect(isWarlockCharacter({ class: 'Warlock', level: 4 })).toBe(true);
    expect(getWarlockClassLevel({ character_class: 'Warlock', level: 4 })).toBe(4);
  });

  test('detects explicit Warlock level fields', () => {
    expect(isWarlockCharacter({ warlock_level: 6 })).toBe(true);
    expect(isWarlockCharacter({ warlockLevel: 7 })).toBe(true);
    expect(getWarlockClassLevel({ warlock_level: 6 })).toBe(6);
    expect(getWarlockClassLevel({ warlockLevel: 7 })).toBe(7);
  });

  test('detects class level maps', () => {
    const character = { class_levels: { Fighter: 2, warlock: 5 } };

    expect(getWarlockClassLevelMap(character)).toEqual({ Fighter: 2, warlock: 5 });
    expect(isWarlockCharacter(character)).toBe(true);
    expect(getWarlockClassLevel(character)).toBe(5);
    expect(hasWarlockClassLevel(character)).toBe(true);
  });

  test('detects multiclass maps with varied casing', () => {
    const character = { multiclassLevels: { 'Warlock ': 3, Rogue: 2 } };

    expect(isWarlockCharacter(character)).toBe(true);
    expect(getWarlockClassLevel(character)).toBe(3);
  });

  test('detects class entry arrays', () => {
    const character = {
      classes: [
        { name: 'Fighter', level: 3 },
        { class_name: 'Warlock', class_level: 4 },
      ],
    };

    expect(isWarlockCharacter(character)).toBe(true);
    expect(getWarlockClassLevel(character)).toBe(4);
  });

  test('falls back to total level for direct Warlock characters', () => {
    expect(getWarlockClassLevel({ character_class: 'Warlock', level: 9 })).toBe(9);
    expect(getWarlockClassLevel({ character_class: 'Warlock' })).toBe(1);
  });

  test('returns false and zero for non-Warlock characters', () => {
    expect(isWarlockCharacter({ character_class: 'Wizard', level: 8 })).toBe(false);
    expect(getWarlockClassLevel({ character_class: 'Wizard', level: 8 })).toBe(0);
    expect(hasWarlockClassLevel({ character_class: 'Wizard', level: 8 })).toBe(false);
  });
});
