import * as wizardPackage from './wizardPackage';

describe('Wizard package exports', () => {
  test('exports the full Wizard package helper surface', () => {
    expect(typeof wizardPackage.isWizardCharacter).toBe('function');
    expect(typeof wizardPackage.getWizardProgressionSummary).toBe('function');
    expect(typeof wizardPackage.getWizardBuilderOptions).toBe('function');
    expect(typeof wizardPackage.getWizardBuilderReadiness).toBe('function');
    expect(typeof wizardPackage.getWizardSheetSummary).toBe('function');
    expect(typeof wizardPackage.getWizardSubclassOptions).toBe('function');
    expect(typeof wizardPackage.getWizardFinalStatus).toBe('function');
  });

  test('returns final ready state for a completed 2014 Wizard selection', () => {
    const status = wizardPackage.getWizardFinalStatus({
      level: 2,
      edition: '2014',
      subclass: 'School of Evocation',
      character: {
        character_class: 'Wizard',
        level: 2,
        rules_edition: '2014',
        subclass: 'School of Evocation',
        spellbookSpells: ['Detect Magic', 'Shield'],
        preparedSpells: ['Shield'],
      },
    });

    expect(status).toMatchObject({
      className: 'Wizard',
      edition: '2014',
      level: 2,
      ready: true,
      errors: [],
    });
    expect(status.sheetSummary.className).toBe('Wizard');
    expect(status.sheetSummary.subclassKey).toBe('evocation');
    expect(status.sheetSummary.arcaneRecoveryLevel).toBe(1);
    expect(status.sheetSummary.spellbookSpellsLabel).toBe('Detect Magic, Shield');
    expect(status.sheetSummary.preparedSpellsLabel).toBe('Shield');
  });

  test('returns final ready state for a completed 2024 Wizard selection', () => {
    const status = wizardPackage.getWizardFinalStatus({
      level: 3,
      edition: '2024',
      subclass: 'School of Illusion',
      scholarSkill: 'Arcana',
      spellbookSpells: ['Detect Magic', 'Shield'],
      preparedSpells: ['Shield'],
      character: {
        character_class: 'Wizard',
        level: 3,
        rules_edition: '2024',
        subclass: 'School of Illusion',
        scholarSkill: 'Arcana',
        spellbookSpells: ['Detect Magic', 'Shield'],
        preparedSpells: ['Shield'],
      },
    });

    expect(status.ready).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.choiceSummary.subclass.key).toBe('illusion');
    expect(status.choiceSummary.scholarSkill.key).toBe('arcana');
    expect(status.sheetSummary.scholarLabel).toBe('Arcana');
    expect(status.sheetSummary.subclassKey).toBe('illusion');
  });

  test('reports missing selections for incomplete 2024 Wizard builds', () => {
    const status = wizardPackage.getWizardFinalStatus({ level: 3, edition: '2024' });

    expect(status.ready).toBe(false);
    expect(status.errors).toEqual(expect.arrayContaining([
      'Choose a Wizard school.',
      'Choose a Scholar skill.',
    ]));
  });

  test('uses Wizard class level for multiclass final status defaults', () => {
    const status = wizardPackage.getWizardFinalStatus({
      character: {
        character_class: 'Fighter',
        level: 12,
        class_levels: { Fighter: 7, Wizard: 5 },
        rules_edition: '2014',
        wizard_subclass: 'School of Abjuration',
      },
    });

    expect(status.level).toBe(5);
    expect(status.ready).toBe(true);
    expect(status.sheetSummary.level).toBe(5);
    expect(status.sheetSummary.subclassKey).toBe('abjuration');
    expect(status.sheetSummary.arcaneRecoveryLevel).toBe(3);
  });
});
