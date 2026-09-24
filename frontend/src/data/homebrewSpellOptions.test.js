import {
  homebrewSpellsForClass,
  normaliseSpellClasses,
  spellDestinationForHomebrewClass,
  spellEntryFromHomebrew,
  spellListModeFromHomebrewClass,
} from './homebrewSpellOptions';

describe('homebrew spell options', () => {
  test('splits mixed class-list formats and preserves unknown homebrew classes', () => {
    expect(normaliseSpellClasses({ classes: 'Wizard; Warlock | Mystic and Bard' })).toEqual([
      'Wizard',
      'Warlock',
      'Mystic',
      'Bard',
    ]);
  });

  test('normalises a saved workshop spell without broadening an explicit custom class', () => {
    expect(spellEntryFromHomebrew({
      name: 'Rune Lance',
      level: 2,
      class_list: 'Runesmith',
      damage: { dice: '3d6', type: 'force' },
    })).toMatchObject({
      name: 'Rune Lance',
      level: 2,
      classes: ['Runesmith'],
      damage: '3d6',
      damageType: 'force',
      homebrew: true,
    });
  });

  test('filters the library by class and current maximum spell level', () => {
    const spells = [
      { name: 'Rune Spark', level: 0, classes: ['Runesmith'] },
      { name: 'Rune Lance', level: 2, classes: ['Runesmith'] },
      { name: 'Greater Rune', level: 4, classes: ['Runesmith'] },
      { name: 'Hex Mark', level: 1, classes: ['Warlock'] },
    ];

    expect(homebrewSpellsForClass(spells, 'Runesmith', 2).map((spell) => spell.name)).toEqual([
      'Rune Spark',
      'Rune Lance',
    ]);
  });

  test('uses the class spellcasting style for new sheet additions', () => {
    expect(spellListModeFromHomebrewClass({ spellcasting: { type: 'prepared' } })).toBe('prepared');
    expect(spellDestinationForHomebrewClass({ spellcasting: { type: 'spellbook' } }, 1)).toBe('spellbook');
    expect(spellDestinationForHomebrewClass({ spellcasting: { type: 'prepared' } }, 0)).toBe('cantrips_known');
  });
});
