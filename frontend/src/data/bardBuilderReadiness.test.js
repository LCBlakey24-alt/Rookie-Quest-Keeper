import { getBardBuilderChoiceSummary } from './bardBuilderChoiceSummary';
import { getBardBuilderOptions, isValidBardSubclass, validateBardBuilderSelections } from './bardBuilderOptions';
import { getBardBuilderReadiness } from './bardBuilderReadiness';
import { getBardSubclassOptions, getBardSubclassSummary } from './bardSubclasses';

describe('Bard builder options and readiness', () => {
  test('returns subclass options for 2014 and 2024 rules', () => {
    expect(getBardSubclassOptions('2014').map(option => option.key)).toEqual(['college_of_lore', 'custom_bard_subclass']);
    expect(getBardSubclassOptions('2024').map(option => option.key)).toEqual(['college_of_lore', 'custom_bard_subclass']);
    expect(getBardSubclassOptions('2024').find(option => option.key === 'custom_bard_subclass')).toMatchObject({ custom: true, supportedAutomation: false });
  });

  test('validates subclass selections by edition', () => {
    expect(isValidBardSubclass('College of Lore', '2014')).toBe(true);
    expect(isValidBardSubclass('college_of_valor', '2024')).toBe(false);
    expect(isValidBardSubclass('College of Dance', '2024')).toBe(false);
    expect(isValidBardSubclass('Custom Bard Subclass', '2014')).toBe(true);
  });

  test('summarises subclass feature levels', () => {
    const summary = getBardSubclassSummary('College of Lore', 6, '2014');

    expect(summary.key).toBe('college_of_lore');
    expect(summary.supportedInRuleset).toBe(true);
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3, 6]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([14]);
  });

  test('summarises cumulative Bard builder choices', () => {
    const levelThree = getBardBuilderChoiceSummary(3, '2014');
    const levelTen = getBardBuilderChoiceSummary(10, '2014');

    expect(levelThree.sections.map(section => section.key)).toEqual(expect.arrayContaining(['subclass', 'expertise']));
    expect(levelThree.sections.find(section => section.key === 'expertise')).toMatchObject({ count: 2 });
    expect(levelTen.sections.find(section => section.key === 'expertise')).toMatchObject({ count: 4 });
    expect(levelTen.sections.find(section => section.key === 'magicalSecrets')).toMatchObject({ count: 2 });
  });

  test('returns 2024 Bard builder options', () => {
    const options = getBardBuilderOptions(3, '2024', 4);

    expect(options.bardicInspirationDie).toBe('d6');
    expect(options.bardicInspirationUses).toBe(4);
    expect(options.needsSubclass).toBe(true);
    expect(options.needsExpertise).toBe(true);
    expect(options.subclassOptions.map(option => option.key)).toEqual(['college_of_lore', 'custom_bard_subclass']);
  });

  test('fails readiness when required choices are missing', () => {
    const readiness = getBardBuilderReadiness({ level: 3, edition: '2014' });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingSections).toEqual(expect.arrayContaining(['Subclass', 'Expertise']));
    expect(readiness.errors).toEqual(expect.arrayContaining([
      'Choose or record a Bard subclass.',
      'Choose 2 Expertise skills.',
    ]));
  });

  test('passes readiness when level 3 choices are present', () => {
    const readiness = getBardBuilderReadiness({
      level: 3,
      edition: '2014',
      subclass: 'College of Lore',
      expertise: ['Persuasion', 'Performance'],
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.errors).toEqual([]);
    expect(readiness.missingSections).toEqual([]);
  });

  test('requires cumulative Expertise and Magical Secrets at level 10', () => {
    const incomplete = validateBardBuilderSelections({
      level: 10,
      edition: '2014',
      subclass: 'College of Lore',
      expertise: ['Persuasion', 'Performance'],
      magicalSecrets: ['Counterspell'],
    });

    expect(incomplete.valid).toBe(false);
    expect(incomplete.errors).toEqual(expect.arrayContaining([
      'Choose 4 Expertise skills.',
      'Choose 2 Magical Secrets spells.',
    ]));

    const complete = validateBardBuilderSelections({
      level: 10,
      edition: '2014',
      subclass: 'College of Lore',
      expertise: ['Persuasion', 'Performance', 'History', 'Arcana'],
      magicalSecrets: ['Counterspell', 'Fireball'],
    });

    expect(complete.valid).toBe(true);
  });
});
