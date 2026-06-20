import * as warlockPackage from './warlockPackage';

describe('Warlock package exports', () => {
  test('exports the full Warlock package helper surface', () => {
    expect(typeof warlockPackage.isWarlockCharacter).toBe('function');
    expect(typeof warlockPackage.getWarlockProgressionSummary).toBe('function');
    expect(typeof warlockPackage.getWarlockBuilderOptions).toBe('function');
    expect(typeof warlockPackage.getWarlockBuilderReadiness).toBe('function');
    expect(typeof warlockPackage.getWarlockSheetSummary).toBe('function');
    expect(typeof warlockPackage.getWarlockSubclassOptions).toBe('function');
    expect(typeof warlockPackage.getWarlockFinalStatus).toBe('function');
  });

  test('returns final ready state for a completed 2014 Warlock selection', () => {
    const status = warlockPackage.getWarlockFinalStatus({
      level: 3,
      edition: '2014',
      subclass: 'Fiend Patron',
      pactBoon: 'Pact of the Blade',
      invocations: ['One', 'Two'],
      character: {
        character_class: 'Warlock',
        level: 3,
        rules_edition: '2014',
        patron: 'Fiend Patron',
        pactBoon: 'Pact of the Blade',
        invocations: ['One', 'Two'],
      },
    });

    expect(status).toMatchObject({
      className: 'Warlock',
      edition: '2014',
      level: 3,
      ready: true,
      errors: [],
    });
    expect(status.sheetSummary.className).toBe('Warlock');
    expect(status.sheetSummary.subclassKey).toBe('fiend');
    expect(status.sheetSummary.pactBoonLabel).toBe('Pact of the Blade');
  });

  test('returns final ready state for a completed 2024 Warlock selection', () => {
    const status = warlockPackage.getWarlockFinalStatus({
      level: 3,
      edition: '2024',
      subclass: 'Archfey Patron',
      pactBoon: 'Pact of the Chain',
      invocations: ['One', 'Two', 'Three'],
      character: {
        character_class: 'Warlock',
        level: 3,
        rules_edition: '2024',
        subclass: 'Archfey Patron',
        pact_boon: 'Pact of the Chain',
        eldritch_invocations: ['One', 'Two', 'Three'],
      },
    });

    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.choiceSummary.subclass.key).toBe('archfey');
    expect(status.choiceSummary.pactBoon.key).toBe('chain');
    expect(status.sheetSummary.subclassKey).toBe('archfey');
  });

  test('reports missing selections for incomplete 2024 Warlock builds', () => {
    const status = warlockPackage.getWarlockFinalStatus({ level: 3, edition: '2024' });

    expect(status.ready).toBe(false);
    expect(status.errors).toEqual(expect.arrayContaining([
      'Choose a Warlock patron.',
      'Choose a Pact Boon.',
      'Choose 3 Eldritch Invocations.',
    ]));
  });

  test('uses Warlock class level for multiclass final status defaults', () => {
    const status = warlockPackage.getWarlockFinalStatus({
      character: {
        character_class: 'Fighter',
        level: 12,
        class_levels: { Fighter: 7, Warlock: 5 },
        rules_edition: '2014',
        patron: 'Celestial Patron',
        pactBoon: 'Pact of the Tome',
        invocations: ['One', 'Two', 'Three'],
      },
    });

    expect(status.level).toBe(5);
    expect(status.ready).toBe(true);
    expect(status.sheetSummary.level).toBe(5);
    expect(status.sheetSummary.subclassKey).toBe('celestial');
    expect(status.sheetSummary.pactMagicSlotLevel).toBe(3);
  });
});
