import {
  getRangerClassLevel,
  getRangerClassLevelMap,
  hasRangerClassLevel,
  isRangerCharacter,
  normaliseRangerClassName,
} from './rangerCharacterShape';

describe('Ranger character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseRangerClassName('Ranger')).toBe('ranger');
    expect(normaliseRangerClassName(' ranger ')).toBe('ranger');
    expect(normaliseRangerClassName('Ranger / Hunter')).toBe('ranger_hunter');
  });

  test('detects direct Ranger class fields', () => {
    expect(isRangerCharacter({ character_class: 'Ranger', level: 4 })).toBe(true);
    expect(isRangerCharacter({ className: 'Ranger', level: 4 })).toBe(true);
    expect(isRangerCharacter({ class: 'Ranger', level: 4 })).toBe(true);
    expect(getRangerClassLevel({ character_class: 'Ranger', level: 4 })).toBe(4);
  });

  test('detects explicit Ranger level fields', () => {
    expect(isRangerCharacter({ ranger_level: 6 })).toBe(true);
    expect(isRangerCharacter({ rangerLevel: 7 })).toBe(true);
    expect(getRangerClassLevel({ ranger_level: 6 })).toBe(6);
    expect(getRangerClassLevel({ rangerLevel: 7 })).toBe(7);
  });

  test('detects class level maps', () => {
    const character = { class_levels: { Fighter: 2, ranger: 5 } };

    expect(getRangerClassLevelMap(character)).toEqual({ Fighter: 2, ranger: 5 });
    expect(isRangerCharacter(character)).toBe(true);
    expect(getRangerClassLevel(character)).toBe(5);
    expect(hasRangerClassLevel(character)).toBe(true);
  });

  test('detects multiclass maps with varied casing', () => {
    const character = { multiclassLevels: { 'Ranger ': 3, Rogue: 2 } };

    expect(isRangerCharacter(character)).toBe(true);
    expect(getRangerClassLevel(character)).toBe(3);
  });

  test('detects class entry arrays', () => {
    const character = {
      classes: [
        { name: 'Fighter', level: 3 },
        { class_name: 'Ranger', class_level: 4 },
      ],
    };

    expect(isRangerCharacter(character)).toBe(true);
    expect(getRangerClassLevel(character)).toBe(4);
  });

  test('falls back to total level for direct Ranger characters', () => {
    expect(getRangerClassLevel({ character_class: 'Ranger', level: 9 })).toBe(9);
    expect(getRangerClassLevel({ character_class: 'Ranger' })).toBe(1);
  });

  test('returns false and zero for non-Ranger characters', () => {
    expect(isRangerCharacter({ character_class: 'Wizard', level: 8 })).toBe(false);
    expect(getRangerClassLevel({ character_class: 'Wizard', level: 8 })).toBe(0);
    expect(hasRangerClassLevel({ character_class: 'Wizard', level: 8 })).toBe(false);
  });
});
