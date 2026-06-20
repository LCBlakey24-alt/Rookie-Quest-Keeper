import {
  getActiveWizardFeatures,
  getNextWizardFeatures,
  getWizardArcaneRecoveryLevel,
  getWizardChoicesForLevel,
  getWizardFeaturesForLevel,
  getWizardProgressionSummary,
  getWizardSpellcastingLevel,
  getWizardSubclassChoiceLevel,
  getWizardSubclassFeatureLevels,
  normaliseWizardRulesEdition,
} from './wizardProgression';

describe('Wizard progression helpers', () => {
  test('normalises Wizard rules editions', () => {
    expect(normaliseWizardRulesEdition('2014')).toBe('2014');
    expect(normaliseWizardRulesEdition('2024')).toBe('2024');
    expect(normaliseWizardRulesEdition('D&D 2024')).toBe('2024');
    expect(normaliseWizardRulesEdition()).toBe('2014');
  });

  test('uses full caster spellcasting level', () => {
    expect(getWizardSpellcastingLevel(0)).toBe(0);
    expect(getWizardSpellcastingLevel(1)).toBe(1);
    expect(getWizardSpellcastingLevel(9)).toBe(9);
    expect(getWizardSpellcastingLevel(20)).toBe(20);
  });

  test('calculates Arcane Recovery spell level budget', () => {
    expect(getWizardArcaneRecoveryLevel(0)).toBe(0);
    expect(getWizardArcaneRecoveryLevel(1)).toBe(1);
    expect(getWizardArcaneRecoveryLevel(2)).toBe(1);
    expect(getWizardArcaneRecoveryLevel(3)).toBe(2);
    expect(getWizardArcaneRecoveryLevel(20)).toBe(10);
  });

  test('tracks subclass timing by edition', () => {
    expect(getWizardSubclassChoiceLevel('2014')).toBe(2);
    expect(getWizardSubclassChoiceLevel('2024')).toBe(3);
    expect(getWizardSubclassFeatureLevels('2014')).toEqual([2, 6, 10, 14]);
    expect(getWizardSubclassFeatureLevels('2024')).toEqual([3, 6, 10, 14]);
  });

  test('returns 2014 Wizard level features and choices', () => {
    expect(getWizardFeaturesForLevel(2, '2014').map(feature => feature.key)).toEqual(['arcane_tradition']);
    expect(getWizardChoicesForLevel(2, '2014').map(feature => feature.choiceType)).toEqual(['subclass']);
    expect(getActiveWizardFeatures(6, '2014').map(feature => feature.key)).toEqual(expect.arrayContaining([
      'spellcasting',
      'arcane_recovery',
      'arcane_tradition',
      'arcane_tradition_feature_6',
    ]));
    expect(getNextWizardFeatures(6, '2014').map(feature => feature.key)).toEqual(['ability_score_improvement_8']);
  });

  test('returns 2024 Wizard level features and choices', () => {
    expect(getWizardFeaturesForLevel(2, '2024').map(feature => feature.key)).toEqual(['scholar']);
    expect(getWizardChoicesForLevel(2, '2024').map(feature => feature.choiceType)).toEqual(['scholar_skill']);
    expect(getWizardFeaturesForLevel(3, '2024').map(feature => feature.key)).toEqual(['wizard_subclass']);
    expect(getWizardChoicesForLevel(3, '2024').map(feature => feature.choiceType)).toEqual(['subclass']);
    expect(getActiveWizardFeatures(7, '2024').map(feature => feature.key)).toEqual(expect.arrayContaining([
      'spellcasting',
      'arcane_recovery',
      'ritual_adept',
      'scholar',
      'wizard_subclass',
      'memorize_spell',
      'subclass_feature_6',
    ]));
  });

  test('summarises 2014 Wizard progression', () => {
    const summary = getWizardProgressionSummary(10, '2014');

    expect(summary).toMatchObject({
      className: 'Wizard',
      edition: '2014',
      level: 10,
      spellcastingLevel: 10,
      arcaneRecoveryLevel: 5,
      subclassChoiceLevel: 2,
      subclassFeatureLevels: [2, 6, 10, 14],
    });
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('arcane_tradition_feature_10');
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['subclass', 'asi_or_feat']));
    expect(summary.nextFeatures.map(feature => feature.key)).toEqual(['ability_score_improvement_12']);
  });

  test('summarises 2024 Wizard progression', () => {
    const summary = getWizardProgressionSummary(5, '2024');

    expect(summary).toMatchObject({
      className: 'Wizard',
      edition: '2024',
      level: 5,
      spellcastingLevel: 5,
      arcaneRecoveryLevel: 3,
      subclassChoiceLevel: 3,
      subclassFeatureLevels: [3, 6, 10, 14],
    });
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('memorize_spell');
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['scholar_skill', 'subclass', 'asi_or_feat']));
    expect(summary.nextFeatures.map(feature => feature.key)).toEqual(['subclass_feature_6']);
  });
});
