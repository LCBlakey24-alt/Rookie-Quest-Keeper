import * as druidPackage from './druidPackage';

describe('Druid package exports', () => {
  test('exports the full Druid package helper surface', () => {
    expect(typeof druidPackage.isDruidCharacter).toBe('function');
    expect(typeof druidPackage.getDruidProgressionSummary).toBe('function');
    expect(typeof druidPackage.getDruidBuilderOptions).toBe('function');
    expect(typeof druidPackage.getDruidBuilderReadiness).toBe('function');
    expect(typeof druidPackage.getDruidSheetSummary).toBe('function');
    expect(typeof druidPackage.getDruidSubclassOptions).toBe('function');
    expect(typeof druidPackage.getDruidFinalStatus).toBe('function');
  });

  test('returns final ready state for a completed 2014 Druid selection', () => {
    const status = druidPackage.getDruidFinalStatus({
      level: 2,
      edition: '2014',
      subclass: 'Circle of the Land',
      character: {
        character_class: 'Druid',
        level: 2,
        rules_edition: '2014',
        subclass: 'Circle of the Land',
        preparedSpells: ['Entangle', 'Cure Wounds'],
      },
    });

    expect(status).toMatchObject({
      className: 'Druid',
      edition: '2014',
      level: 2,
      ready: true,
      errors: [],
    });
    expect(status.sheetSummary.className).toBe('Druid');
    expect(status.sheetSummary.subclassKey).toBe('land');
    expect(status.sheetSummary.wildShapeLabel).toBe('2 Wild Shape uses');
    expect(status.sheetSummary.preparedSpellsLabel).toBe('Entangle, Cure Wounds');
  });

  test('returns final ready state for a completed 2024 Druid selection', () => {
    const status = druidPackage.getDruidFinalStatus({
      level: 7,
      edition: '2024',
      subclass: 'Circle of the Land',
      primalOrder: 'Warden',
      elementalFury: 'Primal Strike',
      preparedSpells: ['Healing Word'],
      character: {
        character_class: 'Druid',
        level: 7,
        rules_edition: '2024',
        subclass: 'Circle of the Land',
        primalOrder: 'Warden',
        elementalFury: 'Primal Strike',
        preparedSpells: ['Healing Word'],
      },
    });

    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.choiceSummary.subclass.key).toBe('land');
    expect(status.choiceSummary.primalOrder.key).toBe('warden');
    expect(status.choiceSummary.elementalFury.key).toBe('primal_strike');
    expect(status.sheetSummary.primalOrderLabel).toBe('Warden');
    expect(status.sheetSummary.elementalFuryLabel).toBe('Primal Strike');
  });

  test('reports missing selections for incomplete 2024 Druid builds', () => {
    const status = druidPackage.getDruidFinalStatus({ level: 7, edition: '2024' });

    expect(status.ready).toBe(false);
    expect(status.errors).toEqual(expect.arrayContaining([
      'Choose or record a Druid circle.',
      'Choose a Primal Order.',
      'Choose an Elemental Fury option.',
    ]));
  });

  test('uses Druid class level for multiclass final status defaults', () => {
    const status = druidPackage.getDruidFinalStatus({
      character: {
        character_class: 'Fighter',
        level: 12,
        class_levels: { Fighter: 7, Druid: 5 },
        rules_edition: '2014',
        druid_subclass: 'Circle of the Land',
      },
    });

    expect(status.level).toBe(5);
    expect(status.ready).toBe(true);
    expect(status.sheetSummary.level).toBe(5);
    expect(status.sheetSummary.subclassKey).toBe('land');
    expect(status.sheetSummary.wildShapeLimitLabel).toBe('CR 1/2 beast forms; no flying speed');
  });
});
