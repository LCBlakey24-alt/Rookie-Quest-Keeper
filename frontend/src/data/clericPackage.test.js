import * as clericPackage from './clericPackage';

describe('Cleric package exports', () => {
  test('exports the full Cleric package helper surface', () => {
    expect(typeof clericPackage.isClericCharacter).toBe('function');
    expect(typeof clericPackage.getClericProgressionSummary).toBe('function');
    expect(typeof clericPackage.getClericBuilderOptions).toBe('function');
    expect(typeof clericPackage.getClericBuilderReadiness).toBe('function');
    expect(typeof clericPackage.getClericSheetSummary).toBe('function');
    expect(typeof clericPackage.getClericSubclassOptions).toBe('function');
    expect(typeof clericPackage.getClericFinalStatus).toBe('function');
  });

  test('returns final ready state for a completed 2014 Cleric selection', () => {
    const status = clericPackage.getClericFinalStatus({
      level: 1,
      edition: '2014',
      subclass: 'Life Domain',
      character: {
        character_class: 'Cleric',
        level: 1,
        subclass: 'Life Domain',
        preparedSpells: ['Bless', 'Cure Wounds'],
      },
    });

    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.sheetSummary.className).toBe('Cleric');
    expect(status.sheetSummary.subclassKey).toBe('life_domain');
  });

  test('returns final ready state for a completed 2024 Cleric selection', () => {
    const status = clericPackage.getClericFinalStatus({
      level: 7,
      edition: '2024',
      subclass: 'War Domain',
      divineOrder: 'Protector',
      blessedStrikes: 'Divine Strike',
      preparedSpells: ['Guiding Bolt'],
      character: {
        character_class: 'Cleric',
        level: 7,
        rules_edition: '2024',
        subclass: 'War Domain',
        divineOrder: 'Protector',
        blessedStrikes: 'Divine Strike',
        preparedSpells: ['Guiding Bolt'],
      },
    });

    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.sheetSummary.divineOrderLabel).toBe('Protector');
    expect(status.sheetSummary.blessedStrikesLabel).toBe('Divine Strike');
  });

  test('reports missing selections for incomplete Cleric builds', () => {
    const status = clericPackage.getClericFinalStatus({ level: 7, edition: '2024' });

    expect(status.ready).toBe(false);
    expect(status.errors).toEqual(expect.arrayContaining([
      'Choose a Cleric subclass.',
      'Choose a Divine Order.',
      'Choose a Blessed Strikes option.',
    ]));
  });
});
