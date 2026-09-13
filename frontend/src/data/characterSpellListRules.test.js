import {
  getCharacterPreparedCapacity,
  getCharacterSpellListMode,
  getSpellListDestination,
  getSpellListLabel,
  spellBelongsToClass,
  tagSpellSource,
} from './characterSpellListRules';

describe('character sheet spell list rules', () => {
  test.each([
    ['2014', 'Bard', 'known', 'spells_known'],
    ['2024', 'Bard', 'prepared', 'spells_prepared'],
    ['2014', 'Ranger', 'known', 'spells_known'],
    ['2024', 'Ranger', 'prepared', 'spells_prepared'],
    ['2014', 'Sorcerer', 'known', 'spells_known'],
    ['2024', 'Sorcerer', 'prepared', 'spells_prepared'],
    ['2014', 'Warlock', 'known', 'spells_known'],
    ['2024', 'Warlock', 'prepared', 'spells_prepared'],
    ['2014', 'Cleric', 'prepared', 'spells_prepared'],
    ['2024', 'Cleric', 'prepared', 'spells_prepared'],
    ['2014', 'Wizard', 'spellbook', 'spellbook'],
    ['2024', 'Wizard', 'spellbook', 'spellbook'],
  ])('%s %s routes levelled spells to the right sheet list', (edition, className, mode, destination) => {
    const character = { rules_edition: edition, character_class: className };
    expect(getCharacterSpellListMode(character, className)).toBe(mode);
    expect(getSpellListDestination(character, className, 1)).toBe(destination);
  });

  test('cantrips always use the cantrip list regardless of caster model', () => {
    expect(getSpellListDestination({ rules_edition: '2024' }, 'Wizard', 0)).toBe('cantrips_known');
    expect(getSpellListDestination({ rules_edition: '2014' }, 'Bard', 0)).toBe('cantrips_known');
  });

  test('labels communicate prepared, known and spellbook storage correctly', () => {
    expect(getSpellListLabel({ rules_edition: '2024' }, 'Bard')).toBe('Prepared');
    expect(getSpellListLabel({ rules_edition: '2014' }, 'Bard')).toBe('Known');
    expect(getSpellListLabel({ rules_edition: '2024' }, 'Wizard')).toBe('Spellbook');
  });

  test('prepared capacity is edition aware', () => {
    expect(getCharacterPreparedCapacity({ rules_edition: '2024', wisdom: 8 }, 'Ranger', 2)).toBe(3);
    expect(getCharacterPreparedCapacity({ rules_edition: '2014', charisma: 18 }, 'Paladin', 5)).toBe(6);
  });

  test('new spell entries retain their source class for multiclass sheets', () => {
    expect(tagSpellSource({ name: 'Shield', level: 1 }, 'Wizard')).toMatchObject({ name: 'Shield', sourceClass: 'Wizard' });
    expect(spellBelongsToClass({ name: 'Shield', sourceClass: 'Wizard' }, 'Wizard')).toBe(true);
    expect(spellBelongsToClass({ name: 'Shield', sourceClass: 'Wizard' }, 'Bard')).toBe(false);
  });

  test('legacy untagged spell entries remain visible rather than disappearing', () => {
    expect(spellBelongsToClass({ name: 'Legacy Spell' }, 'Wizard')).toBe(true);
  });
});
