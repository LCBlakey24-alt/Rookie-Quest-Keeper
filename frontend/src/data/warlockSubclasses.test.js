import {
  getWarlockSubclassByKey,
  getWarlockSubclassKey,
  getWarlockSubclassOptions,
  getWarlockSubclassSummary,
  isWarlockSubclassAvailable,
} from './warlockSubclasses';

describe('Warlock subclass helpers', () => {
  test('normalises Warlock patron names', () => {
    expect(getWarlockSubclassKey('Fiend Patron')).toBe('fiend');
    expect(getWarlockSubclassKey('Archfey Patron')).toBe('archfey');
    expect(getWarlockSubclassKey('Custom Patron')).toBe('custom');
  });

  test('returns 2014 Warlock patron options', () => {
    const options = getWarlockSubclassOptions('2014');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(expect.arrayContaining([
      'archfey',
      'fiend',
      'great_old_one',
      'celestial',
      'genie',
    ]));
    expect(options.find(option => option.key === 'fiend')).toMatchObject({
      label: 'Fiend Patron',
      role: 'Damage caster',
      ruleset: '2014',
    });
  });

  test('returns 2024 Warlock patron options', () => {
    const options = getWarlockSubclassOptions('2024');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(expect.arrayContaining(['archfey', 'fiend', 'great_old_one', 'celestial']));
    expect(keys).not.toContain('genie');
    expect(options.find(option => option.key === 'archfey')).toMatchObject({
      label: 'Archfey Patron',
      role: 'Trickery caster',
      ruleset: '2024',
    });
  });

  test('finds patrons by key or label', () => {
    expect(getWarlockSubclassByKey('fiend', '2014')).toMatchObject({ key: 'fiend' });
    expect(getWarlockSubclassByKey('Great Old One Patron', '2024')).toMatchObject({ key: 'great_old_one' });
    expect(getWarlockSubclassByKey('genie', '2024')).toBeNull();
  });

  test('reports patron availability by edition', () => {
    expect(isWarlockSubclassAvailable('Genie Patron', '2014')).toBe(true);
    expect(isWarlockSubclassAvailable('Genie Patron', '2024')).toBe(false);
    expect(isWarlockSubclassAvailable('Celestial Patron', '2024')).toBe(true);
  });

  test('summarises 2014 patron features by level', () => {
    const summary = getWarlockSubclassSummary('Fiend Patron', 10, '2014');

    expect(summary).toMatchObject({
      key: 'fiend',
      label: 'Fiend Patron',
      role: 'Damage caster',
      ruleset: '2014',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([1, 6, 10]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([14]);
  });

  test('summarises 2024 patron features by level', () => {
    const summary = getWarlockSubclassSummary('archfey', 3, '2024');

    expect(summary).toMatchObject({
      key: 'archfey',
      label: 'Archfey Patron',
      ruleset: '2024',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([6]);
  });

  test('supports custom patron summaries without marking them supported', () => {
    const summary = getWarlockSubclassSummary('Star Patron', 10, '2024');

    expect(summary).toMatchObject({
      key: 'star',
      label: 'Star Patron',
      supportedInRuleset: false,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3, 6, 10]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([14]);
  });
});
