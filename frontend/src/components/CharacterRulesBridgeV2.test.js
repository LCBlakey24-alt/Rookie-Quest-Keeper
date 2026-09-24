import { normaliseFeatCategory, normaliseSpellClasses, spellEntryFromHomebrew } from './CharacterRulesBridgeV2';

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
