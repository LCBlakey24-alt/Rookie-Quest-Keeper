import {
  getSorcererSubclassByKey,
  getSorcererSubclassKey,
  getSorcererSubclassOptions,
  getSorcererSubclassSummary,
  isSorcererSubclassAvailable,
} from './sorcererSubclasses';

describe('Sorcerer subclass helpers', () => {
  test('normalises Sorcerer origin names', () => {
    expect(getSorcererSubclassKey('Draconic Bloodline')).toBe('draconic');
    expect(getSorcererSubclassKey('Sorcerous Origin: Wild Magic')).toBe('wild_magic');
    expect(getSorcererSubclassKey('Sorcerer Subclass: Clockwork Soul')).toBe('clockwork_soul');
  });

  test('returns 2014 Sorcerer origin options', () => {
    const options = getSorcererSubclassOptions('2014');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(expect.arrayContaining([
      'draconic',
      'wild_magic',
      'aberrant_mind',
      'clockwork_soul',
      'divine_soul',
      'shadow_magic',
      'storm_sorcery',
    ]));
    expect(options.find(option => option.key === 'draconic')).toMatchObject({
      label: 'Draconic Bloodline',
      role: 'Elemental caster',
      ruleset: '2014',
    });
  });

  test('returns 2024 Sorcerer subclass options', () => {
    const options = getSorcererSubclassOptions('2024');
    const keys = options.map(option => option.key);

    expect(keys).toEqual(expect.arrayContaining(['draconic', 'wild_magic', 'aberrant_mind', 'clockwork_soul']));
    expect(keys).not.toContain('divine_soul');
    expect(options.find(option => option.key === 'wild_magic')).toMatchObject({
      label: 'Wild Magic',
      role: 'Chaotic caster',
      ruleset: '2024',
    });
  });

  test('finds origins by key or label', () => {
    expect(getSorcererSubclassByKey('draconic', '2014')).toMatchObject({ key: 'draconic' });
    expect(getSorcererSubclassByKey('Aberrant Mind', '2024')).toMatchObject({ key: 'aberrant_mind' });
    expect(getSorcererSubclassByKey('divine_soul', '2024')).toBeNull();
  });

  test('reports origin availability by edition', () => {
    expect(isSorcererSubclassAvailable('Divine Soul', '2014')).toBe(true);
    expect(isSorcererSubclassAvailable('Divine Soul', '2024')).toBe(false);
    expect(isSorcererSubclassAvailable('Clockwork Soul', '2024')).toBe(true);
  });

  test('summarises 2014 origin features by level', () => {
    const summary = getSorcererSubclassSummary('Draconic Bloodline', 14, '2014');

    expect(summary).toMatchObject({
      key: 'draconic',
      label: 'Draconic Bloodline',
      role: 'Elemental caster',
      ruleset: '2014',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([1, 6, 14]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([18]);
  });

  test('summarises 2024 subclass features by level', () => {
    const summary = getSorcererSubclassSummary('wild_magic', 6, '2024');

    expect(summary).toMatchObject({
      key: 'wild_magic',
      label: 'Wild Magic',
      ruleset: '2024',
      supportedInRuleset: true,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3, 6]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([14]);
  });

  test('supports custom origin summaries without marking them supported', () => {
    const summary = getSorcererSubclassSummary('Star Soul', 6, '2024');

    expect(summary).toMatchObject({
      key: 'star_soul',
      label: 'Star Soul',
      supportedInRuleset: false,
    });
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3, 6]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([14]);
  });
});
