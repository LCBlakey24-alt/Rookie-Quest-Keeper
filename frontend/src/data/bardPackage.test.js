import * as bardPackage from './bardPackage';

describe('Bard package exports', () => {
  test('exports the full Bard package helper surface', () => {
    expect(typeof bardPackage.isBardCharacter).toBe('function');
    expect(typeof bardPackage.getBardProgressionSummary).toBe('function');
    expect(typeof bardPackage.getBardBuilderOptions).toBe('function');
    expect(typeof bardPackage.getBardBuilderReadiness).toBe('function');
    expect(typeof bardPackage.getBardSheetSummary).toBe('function');
    expect(typeof bardPackage.getBardSubclassOptions).toBe('function');
    expect(typeof bardPackage.getBardFinalStatus).toBe('function');
  });

  test('returns final ready state for a completed 2014 Bard selection', () => {
    const status = bardPackage.getBardFinalStatus({
      level: 3,
      edition: '2014',
      charismaModifier: 4,
      subclass: 'College of Lore',
      expertise: ['Persuasion', 'Performance'],
      character: {
        character_class: 'Bard',
        level: 3,
        subclass: 'College of Lore',
        charismaModifier: 4,
        expertise: ['Persuasion', 'Performance'],
      },
    });

    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.sheetSummary.className).toBe('Bard');
    expect(status.sheetSummary.subclassKey).toBe('college_of_lore');
  });

  test('reports missing selections for incomplete Bard builds', () => {
    const status = bardPackage.getBardFinalStatus({ level: 3, edition: '2014' });

    expect(status.ready).toBe(false);
    expect(status.errors).toEqual(expect.arrayContaining([
      'Choose a Bard subclass.',
      'Choose 2 Expertise skills.',
    ]));
  });
});
