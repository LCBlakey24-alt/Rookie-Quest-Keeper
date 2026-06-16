import {
  getBardClassLevel,
  getBardClassLevelMap,
  hasBardClassLevel,
  isBardCharacter,
  normaliseBardClassName,
} from './bardCharacterShape';

describe('Bard character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseBardClassName('Bard')).toBe('bard');
    expect(normaliseBardClassName(' bard ')).toBe('bard');
    expect(normaliseBardClassName('Bard / Lore')).toBe('bard_lore');
  });

  test('detects direct Bard class fields', () => {
    expect(isBardCharacter({ character_class: 'Bard', level: 4 })).toBe(true);
    expect(isBardCharacter({ className: 'Bard', level: 4 })).toBe(true);
    expect(isBardCharacter({ class: 'Bard', level: 4 })).toBe(true);
    expect(getBardClassLevel({ character_class: 'Bard', level: 4 })).toBe(4);
  });

  test('detects explicit Bard level fields', () => {
    expect(isBardCharacter({ bard_level: 6 })).toBe(true);
    expect(isBardCharacter({ bardLevel: 7 })).toBe(true);
    expect(getBardClassLevel({ bard_level: 6 })).toBe(6);
    expect(getBardClassLevel({ bardLevel: 7 })).toBe(7);
  });

  test('detects class level maps', () => {
    const character = { class_levels: { Fighter: 2, bard: 5 } };

    expect(getBardClassLevelMap(character)).toEqual({ Fighter: 2, bard: 5 });
    expect(isBardCharacter(character)).toBe(true);
    expect(getBardClassLevel(character)).toBe(5);
    expect(hasBardClassLevel(character)).toBe(true);
  });

  test('detects multiclass maps with varied casing', () => {
    const character = { multiclassLevels: { 'Bard ': 3, Rogue: 2 } };

    expect(isBardCharacter(character)).toBe(true);
    expect(getBardClassLevel(character)).toBe(3);
  });

  test('detects class entry arrays', () => {
    const character = {
      classes: [
        { name: 'Fighter', level: 3 },
        { class_name: 'Bard', class_level: 4 },
      ],
    };

    expect(isBardCharacter(character)).toBe(true);
    expect(getBardClassLevel(character)).toBe(4);
  });

  test('falls back to total level for direct Bard characters', () => {
    expect(getBardClassLevel({ character_class: 'Bard', level: 9 })).toBe(9);
    expect(getBardClassLevel({ character_class: 'Bard' })).toBe(1);
  });

  test('returns false and zero for non-Bard characters', () => {
    expect(isBardCharacter({ character_class: 'Wizard', level: 8 })).toBe(false);
    expect(getBardClassLevel({ character_class: 'Wizard', level: 8 })).toBe(0);
    expect(hasBardClassLevel({ character_class: 'Wizard', level: 8 })).toBe(false);
  });
});
