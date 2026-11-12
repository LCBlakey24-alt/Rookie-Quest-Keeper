import { normaliseFeatCategory, normaliseSpellClasses, spellEntryFromHomebrew, startingSubclassName } from './CharacterRulesBridgeV2';
import { CLASSES } from '@/data/characterRules5e';

describe('uploaded builder option normalization', () => {
  test('splits comma separated spell class lists instead of falling back to every caster', () => {
    expect(normaliseSpellClasses({ classes: 'Wizard, Warlock' })).toEqual(['Wizard', 'Warlock']);
    expect(spellEntryFromHomebrew({ name: 'Gilded Hex', level: 1, class_list: 'Warlock / Wizard' })).toMatchObject({
      name: 'Gilded Hex',
      level: 1,
      classes: ['Warlock', 'Wizard'],
      homebrew: true,
    });
  });

  test('splits mixed uploaded spell class separators from notes and templates', () => {
    expect(normaliseSpellClasses({ classes: 'Wizard; Warlock | Cleric and Bard' })).toEqual([
      'Wizard',
      'Warlock',
      'Cleric',
      'Bard',
    ]);
  });

  test('preserves explicit unknown class spell lists instead of broadening them', () => {
    expect(normaliseSpellClasses({ classes: 'Mystic' })).toEqual(['Mystic']);
  });

  test('keeps the broad fallback only when a spell has no class information', () => {
    expect(normaliseSpellClasses({}).length).toBeGreaterThan(2);
  });

  test('detects uploaded origin and epic feats from common workshop fields', () => {
    expect(normaliseFeatCategory({ name: 'Village Hero', category: 'Origin' })).toBe('origin');
    expect(normaliseFeatCategory({ name: 'First Lesson', prerequisite: 'Level 1 only' })).toBe('origin');
    expect(normaliseFeatCategory({ name: 'Mythic Champion', tags: ['Epic Boon'], prerequisite: '19th-level character' })).toBe('epic');
    expect(normaliseFeatCategory({ name: 'Tavern Trickster' })).toBe('general');
  });
});

describe('the subclass a new character is saved with', () => {
  const fighter = CLASSES.Fighter;
  test('a level 1 Fighter has no subclass yet (it comes at level 3), even with nothing chosen', () => {
    expect(startingSubclassName({ rules_edition: '2014', subclass: '' }, { selectedSubclass: '', level: 1, className: 'Fighter', classData: fighter })).toBe('');
    expect(startingSubclassName({ rules_edition: '2024' }, { selectedSubclass: '', level: 2, className: 'Fighter', classData: fighter })).toBe('');
  });
  test('from the unlock level, the chosen subclass is kept', () => {
    expect(startingSubclassName({ rules_edition: '2014' }, { selectedSubclass: 'Battle Master', level: 3, className: 'Fighter', classData: fighter })).toBe('Battle Master');
  });
  test('classes that choose at level 1 in 2014 keep their choice', () => {
    expect(startingSubclassName({ rules_edition: '2014', subclass: CLASSES.Cleric.subclasses[1] }, { level: 1, className: 'Cleric', classData: CLASSES.Cleric }))
      .toBe(CLASSES.Cleric.subclasses[1]);
  });
});
