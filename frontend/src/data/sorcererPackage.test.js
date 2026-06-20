import * as sorcererPackage from './sorcererPackage';

describe('Sorcerer package exports', () => {
  test('exports the full Sorcerer package helper surface', () => {
    expect(typeof sorcererPackage.isSorcererCharacter).toBe('function');
    expect(typeof sorcererPackage.getSorcererProgressionSummary).toBe('function');
    expect(typeof sorcererPackage.getSorcererBuilderOptions).toBe('function');
    expect(typeof sorcererPackage.getSorcererBuilderReadiness).toBe('function');
    expect(typeof sorcererPackage.getSorcererSheetSummary).toBe('function');
    expect(typeof sorcererPackage.getSorcererSubclassOptions).toBe('function');
    expect(typeof sorcererPackage.getSorcererFinalStatus).toBe('function');
  });

  test('returns final ready state for a completed 2014 Sorcerer selection', () => {
    const status = sorcererPackage.getSorcererFinalStatus({
      level: 3,
      edition: '2014',
      subclass: 'Draconic Bloodline',
      metamagic: ['Careful Spell', 'Subtle Spell'],
      character: {
        character_class: 'Sorcerer',
        level: 3,
        rules_edition: '2014',
        origin: 'Draconic Bloodline',
        metamagic: ['Careful Spell', 'Subtle Spell'],
      },
    });

    expect(status).toMatchObject({
      className: 'Sorcerer',
      edition: '2014',
      level: 3,
      ready: true,
      errors: [],
    });
    expect(status.sheetSummary.className).toBe('Sorcerer');
    expect(status.sheetSummary.subclassKey).toBe('draconic');
    expect(status.choiceSummary.metamagic.map(option => option.key)).toEqual(['careful', 'subtle']);
  });

  test('returns final ready state for a completed 2024 Sorcerer selection', () => {
    const status = sorcererPackage.getSorcererFinalStatus({
      level: 3,
      edition: '2024',
      subclass: 'Wild Magic',
      metamagic: ['Quickened Spell', 'Extended Spell'],
      character: {
        character_class: 'Sorcerer',
        level: 3,
        rules_edition: '2024',
        subclass: 'Wild Magic',
        metamagic_options: ['Quickened Spell', 'Extended Spell'],
      },
    });

    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.choiceSummary.subclass.key).toBe('wild_magic');
    expect(status.choiceSummary.metamagic.map(option => option.key)).toEqual(['quickened', 'extended']);
    expect(status.sheetSummary.subclassKey).toBe('wild_magic');
  });

  test('reports missing selections for incomplete 2024 Sorcerer builds', () => {
    const status = sorcererPackage.getSorcererFinalStatus({ level: 3, edition: '2024' });

    expect(status.ready).toBe(false);
    expect(status.errors).toEqual(expect.arrayContaining([
      'Choose a Sorcerer origin.',
      'Choose 2 Metamagic options.',
    ]));
  });

  test('uses Sorcerer class level for multiclass final status defaults', () => {
    const status = sorcererPackage.getSorcererFinalStatus({
      character: {
        character_class: 'Fighter',
        level: 12,
        class_levels: { Fighter: 7, Sorcerer: 5 },
        rules_edition: '2014',
        origin: 'Divine Soul',
        metamagic: ['Careful Spell', 'Subtle Spell'],
      },
    });

    expect(status.level).toBe(5);
    expect(status.ready).toBe(true);
    expect(status.sheetSummary.level).toBe(5);
    expect(status.sheetSummary.subclassKey).toBe('divine_soul');
    expect(status.sheetSummary.sorceryPointMaximum).toBe(5);
  });
});
