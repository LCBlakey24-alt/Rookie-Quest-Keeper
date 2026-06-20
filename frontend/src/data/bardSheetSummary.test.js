import { getBardSheetSummary } from './bardSheetSummary';

describe('Bard sheet summary', () => {
  test('returns basic 2014 Bard sheet data', () => {
    const summary = getBardSheetSummary({
      character_class: 'Bard',
      level: 5,
      subclass: 'College of Lore',
      charismaModifier: 4,
      expertise: ['Persuasion', 'Performance'],
    });

    expect(summary.className).toBe('Bard');
    expect(summary.edition).toBe('2014');
    expect(summary.level).toBe(5);
    expect(summary.isBard).toBe(true);
    expect(summary.subclassKey).toBe('college_of_lore');
    expect(summary.subclassLabel).toBe('College of Lore');
    expect(summary.subclassRole).toBe('Skill and support specialist');
    expect(summary.subclassSupportedInRuleset).toBe(true);
    expect(summary.bardicInspirationDie).toBe('d8');
    expect(summary.bardicInspirationUses).toBe(4);
    expect(summary.bardicInspirationLabel).toBe('4 Bardic Inspiration d8');
    expect(summary.expertiseLabel).toBe('Persuasion, Performance');
    expect(summary.magicalSecretsLabel).toBe('None yet');
    expect(summary.spellcastingOnline).toBe(true);
    expect(summary.spellcastingLevel).toBe(5);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('font_of_inspiration');
  });

  test('returns 2024 Bard sheet labels', () => {
    const summary = getBardSheetSummary({
      character_class: 'Bard',
      level: 10,
      rules_edition: '2024',
      subclass: 'College of Dance',
      charisma_modifier: 5,
      expertise_skills: ['Acrobatics', 'Performance', 'Persuasion', 'Stealth'],
      magicalSecrets: ['Counterspell', 'Fireball'],
    });

    expect(summary.edition).toBe('2024');
    expect(summary.subclassKey).toBe('college_of_dance');
    expect(summary.subclassLabel).toBe('College of Dance');
    expect(summary.subclassSupportedInRuleset).toBe(true);
    expect(summary.bardicInspirationDie).toBe('d10');
    expect(summary.bardicInspirationUses).toBe(5);
    expect(summary.expertiseLabel).toBe('Acrobatics, Performance, Persuasion, Stealth');
    expect(summary.magicalSecretsLabel).toBe('Counterspell, Fireball');
    expect(summary.spellcastingHint).toBe('Full caster level 10');
  });

  test('prompts for subclass from level 3', () => {
    const summary = getBardSheetSummary({ character_class: 'Bard', level: 3 });

    expect(summary.subclassLabel).toBe('Choose/record Bard Subclass');
  });

  test('supports multiclass Bard levels', () => {
    const summary = getBardSheetSummary({ character_class: 'Fighter', level: 12, class_levels: { Fighter: 7, Bard: 5 }, charismaModifier: 3 });

    expect(summary.isBard).toBe(true);
    expect(summary.level).toBe(5);
    expect(summary.spellcastingLevel).toBe(5);
    expect(summary.bardicInspirationDie).toBe('d8');
    expect(summary.bardicInspirationUses).toBe(3);
  });

  test('marks unsupported subclass rulesets', () => {
    const summary = getBardSheetSummary({ character_class: 'Bard', level: 6, rules_edition: '2014', subclass: 'College of Dance' });

    expect(summary.subclassSupportedInRuleset).toBe(false);
    expect(summary.subclassLabel).toBe('College of Dance');
  });

  test('includes active, next, and subclass features', () => {
    const summary = getBardSheetSummary({ character_class: 'Bard', level: 10, subclass: 'College of Lore', charismaModifier: 4 });

    expect(summary.activeFeatures.map(feature => feature.key)).toContain('bardic_inspiration');
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('magical_secrets');
    expect(summary.subclassFeatures.map(feature => feature.level)).toEqual([3, 6]);
    expect(summary.nextSubclassFeatures.map(feature => feature.level)).toEqual([14]);
    expect(summary.nextFeatures.length).toBeGreaterThan(0);
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['expertise', 'magical_secrets']));
  });
});
