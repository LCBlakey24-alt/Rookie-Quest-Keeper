import {
  getSorcererClassLevel,
  getSorcererClassLevelMap,
  hasSorcererClassLevel,
  isSorcererCharacter,
  normaliseSorcererClassName,
} from './sorcererCharacterShape';

describe('Sorcerer character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseSorcererClassName('Sorcerer')).toBe('sorcerer');
    expect(normaliseSorcererClassName(' sorcerer ')).toBe('sorcerer');
    expect(normaliseSorcererClassName('Sorcerer / Draconic')).toBe('sorcerer_draconic');
  });

  test('detects direct Sorcerer class fields', () => {
    expect(isSorcererCharacter({ character_class: 'Sorcerer', level: 4 })).toBe(true);
    expect(isSorcererCharacter({ className: 'Sorcerer', level: 4 })).toBe(true);
    expect(isSorcererCharacter({ class: 'Sorcerer', level: 4 })).toBe(true);
    expect(getSorcererClassLevel({ character_class: 'Sorcerer', level: 4 })).toBe(4);
  });

  test('detects explicit Sorcerer level fields', () => {
    expect(isSorcererCharacter({ sorcerer_level: 6 })).toBe(true);
    expect(isSorcererCharacter({ sorcererLevel: 7 })).toBe(true);
    expect(getSorcererClassLevel({ sorcerer_level: 6 })).toBe(6);
    expect(getSorcererClassLevel({ sorcererLevel: 7 })).toBe(7);
  });

  test('detects class level maps', () => {
    const character = { class_levels: { Fighter: 2, sorcerer: 5 } };

    expect(getSorcererClassLevelMap(character)).toEqual({ Fighter: 2, sorcerer: 5 });
    expect(isSorcererCharacter(character)).toBe(true);
    expect(getSorcererClassLevel(character)).toBe(5);
    expect(hasSorcererClassLevel(character)).toBe(true);
  });

  test('detects multiclass maps with varied casing', () => {
    const character = { multiclassLevels: { 'Sorcerer ': 3, Rogue: 2 } };

    expect(isSorcererCharacter(character)).toBe(true);
    expect(getSorcererClassLevel(character)).toBe(3);
  });

  test('detects class entry arrays', () => {
    const character = {
      classes: [
        { name: 'Fighter', level: 3 },
        { class_name: 'Sorcerer', class_level: 4 },
      ],
    };

    expect(isSorcererCharacter(character)).toBe(true);
    expect(getSorcererClassLevel(character)).toBe(4);
  });

  test('falls back to total level for direct Sorcerer characters', () => {
    expect(getSorcererClassLevel({ character_class: 'Sorcerer', level: 9 })).toBe(9);
    expect(getSorcererClassLevel({ character_class: 'Sorcerer' })).toBe(1);
  });

  test('returns false and zero for non-Sorcerer characters', () => {
    expect(isSorcererCharacter({ character_class: 'Wizard', level: 8 })).toBe(false);
    expect(getSorcererClassLevel({ character_class: 'Wizard', level: 8 })).toBe(0);
    expect(hasSorcererClassLevel({ character_class: 'Wizard', level: 8 })).toBe(false);
  });
});
