import {
  getCharacterBuilderClassOptions,
  getCharacterBuilderSubclassNames,
  getCharacterBuilderSubclassOptions,
} from './characterBuilderClassOptions';

describe('character builder class options resolver', () => {
  test('prefers package subclass options when a class package exists', () => {
    const options = getCharacterBuilderClassOptions('Sorcerer', { edition: '2024', level: 1 });

    expect(options.hasClassData).toBe(true);
    expect(options.hasPackage).toBe(true);
    expect(options.usesPackageSubclassOptions).toBe(true);
    expect(options.subclassOptions.map(option => option.key)).toEqual(expect.arrayContaining(['draconic', 'wild_magic', 'aberrant_mind', 'clockwork_soul']));
    expect(options.subclassOptions.map(option => option.key)).not.toContain('divine_soul');
  });

  test('falls back to static subclass options for unknown package classes', () => {
    const options = getCharacterBuilderClassOptions('Inventor', {
      classes: {
        Inventor: {
          name: 'Inventor',
          subclasses: ['Gadgeteer', 'Alchemist'],
        },
      },
    });

    expect(options.hasClassData).toBe(true);
    expect(options.hasPackage).toBe(false);
    expect(options.usesPackageSubclassOptions).toBe(false);
    expect(options.subclassNames).toEqual(['Gadgeteer', 'Alchemist']);
  });

  test('returns convenience subclass lists', () => {
    expect(getCharacterBuilderSubclassNames('Fighter', { edition: '2014' })).toEqual(['Champion']);
    expect(getCharacterBuilderSubclassOptions('Warlock', { edition: '2014' })[0]).toEqual(expect.objectContaining({
      value: expect.any(String),
      label: expect.any(String),
      key: expect.any(String),
    }));
  });

  test('returns safe empty data for missing classes', () => {
    const options = getCharacterBuilderClassOptions('', { edition: '2014' });

    expect(options.hasClassData).toBe(false);
    expect(options.hasPackage).toBe(false);
    expect(options.subclassOptions).toEqual([]);
    expect(options.subclassNames).toEqual([]);
  });
});
