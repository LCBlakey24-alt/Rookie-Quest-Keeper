import {
  getClericClassLevel,
  getClericClassLevelMap,
  hasClericClassLevel,
  isClericCharacter,
  normaliseClericClassName,
} from './clericCharacterShape';

describe('Cleric character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseClericClassName('Cleric')).toBe('cleric');
    expect(normaliseClericClassName(' cleric ')).toBe('cleric');
    expect(normaliseClericClassName('Cleric / Life')).toBe('cleric_life');
  });

  test('detects direct Cleric class fields', () => {
    expect(isClericCharacter({ character_class: 'Cleric', level: 4 })).toBe(true);
    expect(isClericCharacter({ className: 'Cleric', level: 4 })).toBe(true);
    expect(isClericCharacter({ class: 'Cleric', level: 4 })).toBe(true);
    expect(getClericClassLevel({ character_class: 'Cleric', level: 4 })).toBe(4);
  });

  test('detects explicit Cleric level fields', () => {
    expect(isClericCharacter({ cleric_level: 6 })).toBe(true);
    expect(isClericCharacter({ clericLevel: 7 })).toBe(true);
    expect(getClericClassLevel({ cleric_level: 6 })).toBe(6);
    expect(getClericClassLevel({ clericLevel: 7 })).toBe(7);
  });

  test('detects class level maps', () => {
    const character = { class_levels: { Fighter: 2, cleric: 5 } };

    expect(getClericClassLevelMap(character)).toEqual({ Fighter: 2, cleric: 5 });
    expect(isClericCharacter(character)).toBe(true);
    expect(getClericClassLevel(character)).toBe(5);
    expect(hasClericClassLevel(character)).toBe(true);
  });

  test('detects multiclass maps with varied casing', () => {
    const character = { multiclassLevels: { 'Cleric ': 3, Rogue: 2 } };

    expect(isClericCharacter(character)).toBe(true);
    expect(getClericClassLevel(character)).toBe(3);
  });

  test('detects class entry arrays', () => {
    const character = {
      classes: [
        { name: 'Fighter', level: 3 },
        { class_name: 'Cleric', class_level: 4 },
      ],
    };

    expect(isClericCharacter(character)).toBe(true);
    expect(getClericClassLevel(character)).toBe(4);
  });

  test('falls back to total level for direct Cleric characters', () => {
    expect(getClericClassLevel({ character_class: 'Cleric', level: 9 })).toBe(9);
    expect(getClericClassLevel({ character_class: 'Cleric' })).toBe(1);
  });

  test('returns false and zero for non-Cleric characters', () => {
    expect(isClericCharacter({ character_class: 'Wizard', level: 8 })).toBe(false);
    expect(getClericClassLevel({ character_class: 'Wizard', level: 8 })).toBe(0);
    expect(hasClericClassLevel({ character_class: 'Wizard', level: 8 })).toBe(false);
  });
});
