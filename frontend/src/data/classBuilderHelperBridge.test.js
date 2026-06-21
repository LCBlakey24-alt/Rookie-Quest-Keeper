import {
  getClassBuilderUiOptions,
  getClassPackageBuilderOptions,
  getClassPackageSubclassOptions,
  hasClassBuilderPackage,
} from './classBuilderHelperBridge';

describe('class builder helper bridge', () => {
  test('detects known class packages', () => {
    expect(hasClassBuilderPackage('Fighter')).toBe(true);
    expect(hasClassBuilderPackage('Sorcerer')).toBe(true);
    expect(hasClassBuilderPackage('Warlock')).toBe(true);
    expect(hasClassBuilderPackage('warlock')).toBe(true);
    expect(hasClassBuilderPackage(' PALADIN ')).toBe(true);
    expect(hasClassBuilderPackage('sorcerer')).toBe(true);
    expect(hasClassBuilderPackage('Unknown')).toBe(false);
  });

  test('returns subclass options from class packages', () => {
    expect(getClassPackageSubclassOptions('Fighter', '2014').map(option => option.key)).toEqual(expect.arrayContaining(['champion', 'battle_master', 'eldritch_knight']));
    expect(getClassPackageSubclassOptions('Sorcerer', '2024').map(option => option.key)).toEqual(expect.arrayContaining(['draconic', 'wild_magic', 'aberrant_mind', 'clockwork_soul']));
    expect(getClassPackageSubclassOptions('paladin', '2014').map(option => option.key)).toEqual(expect.arrayContaining(['devotion']));
    expect(getClassPackageSubclassOptions('Unknown', '2014')).toEqual([]);
  });

  test('respects edition-specific subclass availability', () => {
    expect(getClassPackageSubclassOptions('Sorcerer', '2014').map(option => option.key)).toContain('divine_soul');
    expect(getClassPackageSubclassOptions('Sorcerer', '2024').map(option => option.key)).not.toContain('divine_soul');
  });

  test('returns builder options from existing helper shapes', () => {
    expect(getClassPackageBuilderOptions('Fighter', { level: 1, edition: '2014' })).toMatchObject({
      edition: '2014',
      level: 1,
      needsFightingStyle: true,
    });

    expect(getClassPackageBuilderOptions('sorcerer', { level: 3, edition: '2024' })).toMatchObject({
      edition: '2024',
      level: 3,
      subclassChoiceLevel: 3,
      metamagicCount: 2,
    });
  });

  test('builds UI-ready options', () => {
    const options = getClassBuilderUiOptions(' warlock ', { level: 1, edition: '2014' });

    expect(options.className).toBe('Warlock');
    expect(options.hasPackage).toBe(true);
    expect(options.hasSubclassOptions).toBe(true);
    expect(options.subclassOptions[0]).toEqual(expect.objectContaining({ value: expect.any(String), label: expect.any(String), key: expect.any(String) }));
  });
});
