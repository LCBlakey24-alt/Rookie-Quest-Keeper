import {
  getDruidSubclassByKey,
  getDruidSubclassKey,
  getDruidSubclassOptions,
  getDruidSubclassSummary,
  isDruidSubclassAvailable,
} from './druidSubclasses';

describe('Druid subclass helpers', () => {
  test('normalises Druid circle names', () => {
    expect(getDruidSubclassKey('Circle of the Land')).toBe('land');
    expect(getDruidSubclassKey('Circle of Moon')).toBe('moon');
    expect(getDruidSubclassKey('Custom Druid Subclass')).toBe('custom_druid_subclass');
  });

  test('returns 2014 Druid circle options', () => {
    const options = getDruidSubclassOptions('2014');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(['land', 'custom_druid_subclass']);
    expect(keys).not.toContain('sea');
    expect(options.find(option => option.key === 'custom_druid_subclass')).toMatchObject({
      label: 'Custom / user-added subclass',
      role: 'User-provided Druid circle',
      ruleset: '2014',
      custom: true,
      supportedAutomation: false,
    });
  });

  test('returns 2024 Druid circle options', () => {
    const options = getDruidSubclassOptions('2024');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(['land', 'custom_druid_subclass']);
    expect(keys).not.toContain('dreams');
    expect(options.find(option => option.key === 'land')).toMatchObject({
      label: 'Circle of the Land',
      role: 'Prepared nature caster',
      ruleset: '2024',
      supportedAutomation: true,
    });
  });

  test('finds subclasses by key or label', () => {
    expect(getDruidSubclassByKey('Custom Druid Subclass', '2014')).toMatchObject({ key: 'custom_druid_subclass' });
    expect(getDruidSubclassByKey('Circle of the Land', '2024')).toMatchObject({ key: 'land' });
    expect(getDruidSubclassByKey('sea', '2014')).toBeNull();
  });

  test('reports subclass availability by edition', () => {
    expect(isDruidSubclassAvailable('Circle of Spores', '2014')).toBe(false);
    expect(isDruidSubclassAvailable('Circle of Spores', '2024')).toBe(false);
    expect(isDruidSubclassAvailable('Custom Druid Subclass', '2024')).toBe(true);
  });

  test('summarises 2014 subclass features by level', () => {
    const summary = getDruidSubclassSummary('Circle of the Land', 6, '2014');

    expect(summary).toMatchObject({
      key: 'land',
      label: 'Circle of the Land',
      role: 'Prepared nature caster',
      ruleset: '2014',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([2, 6]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([10]);
  });

  test('summarises 2024 subclass features by level', () => {
    const summary = getDruidSubclassSummary('land', 3, '2024');

    expect(summary).toMatchObject({
      key: 'land',
      label: 'Circle of the Land',
      ruleset: '2024',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([6]);
  });

  test('supports custom or unavailable subclass summaries without marking them supported', () => {
    const summary = getDruidSubclassSummary('Circle of Homebrew Spores', 10, '2024');

    expect(summary).toMatchObject({
      key: 'homebrew_spores',
      label: 'Circle of Homebrew Spores',
      supportedInRuleset: false,
    });
    expect(summary.activeFeatures).toEqual([]);
    expect(summary.nextFeatures).toEqual([]);
  });
});
