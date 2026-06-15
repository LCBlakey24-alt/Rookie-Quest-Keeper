import {
  getBarbarianClassLevelMap,
  hasBarbarianClassLevel,
  isBarbarianCharacter,
  normaliseBarbarianClassName,
} from './barbarianCharacterShape';

describe('Barbarian character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseBarbarianClassName(' Barbarian ')).toBe('barbarian');
    expect(normaliseBarbarianClassName('barbarian!!!')).toBe('barbarian');
    expect(normaliseBarbarianClassName('Barbarian Path')).toBe('barbarianpath');
  });

  test('detects direct Barbarian class names', () => {
    expect(isBarbarianCharacter({ character_class: 'Barbarian' })).toBe(true);
    expect(isBarbarianCharacter({ className: 'Barbarian' })).toBe(true);
    expect(isBarbarianCharacter({ class: 'Barbarian' })).toBe(true);
  });

  test('detects direct Barbarian level fields', () => {
    expect(hasBarbarianClassLevel({ barbarian_level: 1 })).toBe(true);
    expect(hasBarbarianClassLevel({ barbarianLevel: 2 })).toBe(true);
    expect(isBarbarianCharacter({ character_class: 'Fighter', barbarianLevel: 1 })).toBe(true);
  });

  test('detects Barbarian levels from level maps', () => {
    expect(getBarbarianClassLevelMap({ classLevels: { Barbarian: 3 } })).toEqual({ Barbarian: 3 });
    expect(isBarbarianCharacter({ character_class: 'Rogue', classLevels: { Barbarian: 3 } })).toBe(true);
    expect(isBarbarianCharacter({ character_class: 'Rogue', class_levels: { barbarian: 1 } })).toBe(true);
    expect(isBarbarianCharacter({ character_class: 'Rogue', multiclass_levels: { Barbarian: 2 } })).toBe(true);
  });

  test('detects Barbarian from class entry lists', () => {
    const character = {
      character_class: 'Rogue',
      classes: [
        { name: 'Rogue', level: 5 },
        { class_name: 'Barbarian', level: 2 },
      ],
    };

    expect(isBarbarianCharacter(character)).toBe(true);
  });

  test('does not detect non-Barbarian characters', () => {
    expect(isBarbarianCharacter({ character_class: 'Fighter' })).toBe(false);
    expect(isBarbarianCharacter({ classes: [{ name: 'Wizard', level: 3 }] })).toBe(false);
    expect(hasBarbarianClassLevel({ barbarianLevel: 0 })).toBe(false);
  });
});
