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
    expect(getDruidSubclassKey('Druid Circle of Stars')).toBe('stars');
  });

  test('returns 2014 Druid circle options', () => {
    const options = getDruidSubclassOptions('2014');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(expect.arrayContaining(['land', 'moon', 'dreams', 'shepherd', 'spores', 'wildfire']));
    expect(keys).not.toContain('sea');
    expect(options.find(option => option.key === 'moon')).toMatchObject({
      label: 'Circle of the Moon',
      role: 'Wild Shape bruiser',
      ruleset: '2014',
    });
  });

  test('returns 2024 Druid circle options', () => {
    const options = getDruidSubclassOptions('2024');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(expect.arrayContaining(['land', 'moon', 'sea', 'stars']));
    expect(keys).not.toContain('dreams');
    expect(options.find(option => option.key === 'sea')).toMatchObject({
      label: 'Circle of the Sea',
      role: 'Elemental skirmisher',
      ruleset: '2024',
    });
  });

  test('finds subclasses by key or label', () => {
    expect(getDruidSubclassByKey('moon', '2014')).toMatchObject({ key: 'moon' });
    expect(getDruidSubclassByKey('Circle of the Land', '2024')).toMatchObject({ key: 'land' });
    expect(getDruidSubclassByKey('sea', '2014')).toBeNull();
  });

  test('reports subclass availability by edition', () => {
    expect(isDruidSubclassAvailable('Circle of Spores', '2014')).toBe(true);
    expect(isDruidSubclassAvailable('Circle of Spores', '2024')).toBe(false);
    expect(isDruidSubclassAvailable('Circle of the Sea', '2024')).toBe(true);
  });

  test('summarises 2014 subclass features by level', () => {
    const summary = getDruidSubclassSummary('Circle of the Moon', 6, '2014');

    expect(summary).toMatchObject({
      key: 'moon',
      label: 'Circle of the Moon',
      role: 'Wild Shape bruiser',
      ruleset: '2014',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([2, 6]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([10]);
  });

  test('summarises 2024 subclass features by level', () => {
    const summary = getDruidSubclassSummary('sea', 3, '2024');

    expect(summary).toMatchObject({
      key: 'sea',
      label: 'Circle of the Sea',
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
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3, 6, 10]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([14]);
  });
});
