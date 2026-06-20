import {
  getWizardSubclassByKey,
  getWizardSubclassKey,
  getWizardSubclassOptions,
  getWizardSubclassSummary,
  isWizardSubclassAvailable,
} from './wizardSubclasses';

describe('Wizard subclass helpers', () => {
  test('normalises Wizard school names', () => {
    expect(getWizardSubclassKey('School of Abjuration')).toBe('abjuration');
    expect(getWizardSubclassKey('Wizard School of Illusion')).toBe('illusion');
    expect(getWizardSubclassKey('Bladesinger')).toBe('bladesinger');
  });

  test('returns 2014 Wizard school options', () => {
    const options = getWizardSubclassOptions('2014');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(expect.arrayContaining([
      'abjuration',
      'conjuration',
      'divination',
      'enchantment',
      'evocation',
      'illusion',
      'necromancy',
      'transmutation',
    ]));
    expect(options.find(option => option.key === 'evocation')).toMatchObject({
      label: 'School of Evocation',
      role: 'Arcane blaster',
      ruleset: '2014',
    });
  });

  test('returns 2024 Wizard school options', () => {
    const options = getWizardSubclassOptions('2024');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(expect.arrayContaining(['abjuration', 'divination', 'evocation', 'illusion']));
    expect(keys).not.toContain('necromancy');
    expect(options.find(option => option.key === 'abjuration')).toMatchObject({
      label: 'School of Abjuration',
      role: 'Defensive warder',
      ruleset: '2024',
    });
  });

  test('finds subclasses by key or label', () => {
    expect(getWizardSubclassByKey('evocation', '2014')).toMatchObject({ key: 'evocation' });
    expect(getWizardSubclassByKey('School of Divination', '2024')).toMatchObject({ key: 'divination' });
    expect(getWizardSubclassByKey('necromancy', '2024')).toBeNull();
  });

  test('reports subclass availability by edition', () => {
    expect(isWizardSubclassAvailable('School of Necromancy', '2014')).toBe(true);
    expect(isWizardSubclassAvailable('School of Necromancy', '2024')).toBe(false);
    expect(isWizardSubclassAvailable('School of Illusion', '2024')).toBe(true);
  });

  test('summarises 2014 subclass features by level', () => {
    const summary = getWizardSubclassSummary('School of Evocation', 6, '2014');

    expect(summary).toMatchObject({
      key: 'evocation',
      label: 'School of Evocation',
      role: 'Arcane blaster',
      ruleset: '2014',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([2, 6]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([10]);
  });

  test('summarises 2024 subclass features by level', () => {
    const summary = getWizardSubclassSummary('illusion', 3, '2024');

    expect(summary).toMatchObject({
      key: 'illusion',
      label: 'School of Illusion',
      ruleset: '2024',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([6]);
  });

  test('supports custom or unavailable subclass summaries without marking them supported', () => {
    const summary = getWizardSubclassSummary('School of Chronomancy', 10, '2024');

    expect(summary).toMatchObject({
      key: 'chronomancy',
      label: 'School of Chronomancy',
      supportedInRuleset: false,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3, 6, 10]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([14]);
  });
});
