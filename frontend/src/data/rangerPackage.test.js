import * as rangerPackage from './rangerPackage';

describe('Ranger package exports', () => {
  test('exports the full Ranger package helper surface', () => {
    expect(typeof rangerPackage.isRangerCharacter).toBe('function');
    expect(typeof rangerPackage.getRangerProgressionSummary).toBe('function');
    expect(typeof rangerPackage.getRangerBuilderOptions).toBe('function');
    expect(typeof rangerPackage.getRangerBuilderReadiness).toBe('function');
    expect(typeof rangerPackage.getRangerSheetSummary).toBe('function');
    expect(typeof rangerPackage.getRangerSubclassOptions).toBe('function');
    expect(typeof rangerPackage.getRangerFinalStatus).toBe('function');
  });

  test('returns final ready state for a completed 2014 Ranger selection', () => {
    const status = rangerPackage.getRangerFinalStatus({
      level: 3,
      edition: '2014',
      subclass: 'Hunter',
      fightingStyle: 'Archery',
      favoredEnemy: 'Undead',
      favoredTerrain: 'Forest',
      character: {
        character_class: 'Ranger',
        level: 3,
        subclass: 'Hunter',
        fightingStyle: 'Archery',
        favoredEnemy: 'Undead',
        favoredTerrain: 'Forest',
      },
    });

    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.sheetSummary.className).toBe('Ranger');
    expect(status.sheetSummary.subclassKey).toBe('hunter');
  });

  test('reports missing selections for incomplete Ranger builds', () => {
    const status = rangerPackage.getRangerFinalStatus({ level: 3, edition: '2024' });

    expect(status.ready).toBe(false);
    expect(status.errors).toEqual(expect.arrayContaining([
      'Choose Ranger weapon masteries.',
      'Choose a Fighting Style.',
      'Choose a Ranger subclass.',
    ]));
  });
});
