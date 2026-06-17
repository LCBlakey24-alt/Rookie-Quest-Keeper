import {
  getActiveDruidFeatures,
  getDruidChoicesForLevel,
  getDruidFeaturesForLevel,
  getDruidProgressionSummary,
  getDruidSpellcastingLevel,
  getDruidSubclassChoiceLevel,
  getDruidSubclassFeatureLevels,
  getDruidWildShapeLimit,
  getDruidWildShapeUses,
  getNextDruidFeatures,
  normaliseDruidRulesEdition,
} from './druidProgression';

describe('Druid progression helpers', () => {
  test('normalises rules editions', () => {
    expect(normaliseDruidRulesEdition('2014')).toBe('2014');
    expect(normaliseDruidRulesEdition('5e 2024')).toBe('2024');
    expect(normaliseDruidRulesEdition()).toBe('2014');
  });

  test('returns Druid full-caster spellcasting progression level', () => {
    expect(getDruidSpellcastingLevel(1)).toBe(1);
    expect(getDruidSpellcastingLevel(7)).toBe(7);
    expect(getDruidSpellcastingLevel(20)).toBe(20);
  });

  test('returns subclass timing by rules edition', () => {
    expect(getDruidSubclassChoiceLevel('2014')).toBe(2);
    expect(getDruidSubclassChoiceLevel('2024')).toBe(3);
    expect(getDruidSubclassFeatureLevels('2014')).toEqual([2, 6, 10, 14]);
    expect(getDruidSubclassFeatureLevels('2024')).toEqual([3, 6, 10, 14]);
  });

  test('returns Wild Shape uses and 2014 form limits', () => {
    expect(getDruidWildShapeUses(1)).toBe(0);
    expect(getDruidWildShapeUses(2)).toBe(2);
    expect(getDruidWildShapeLimit(1, '2014')).toBeNull();
    expect(getDruidWildShapeLimit(2, '2014')).toBe('CR 1/4 beast forms; no swimming or flying speed');
    expect(getDruidWildShapeLimit(4, '2014')).toBe('CR 1/2 beast forms; no flying speed');
    expect(getDruidWildShapeLimit(8, '2014')).toBe('CR 1 beast forms');
  });

  test('returns 2024 Wild Shape support label', () => {
    expect(getDruidWildShapeLimit(2, '2024')).toBe('2024 Wild Shape forms online');
  });

  test('returns 2014 Druid choices and unlocks', () => {
    expect(getDruidChoicesForLevel(2, '2014').map(choice => choice.choiceType)).toContain('subclass');
    expect(getDruidFeaturesForLevel(18, '2014').map(feature => feature.key)).toEqual(expect.arrayContaining(['timeless_body', 'beast_spells']));
    expect(getNextDruidFeatures(1, '2014').map(feature => feature.key)).toEqual(expect.arrayContaining(['wild_shape', 'druid_circle']));
  });

  test('returns 2024 Druid choices and unlocks', () => {
    expect(getDruidChoicesForLevel(1, '2024').map(choice => choice.choiceType)).toContain('primal_order');
    expect(getDruidChoicesForLevel(3, '2024').map(choice => choice.choiceType)).toContain('subclass');
    expect(getDruidChoicesForLevel(7, '2024').map(choice => choice.choiceType)).toContain('elemental_fury');
  });

  test('summarises active 2014 Druid progression', () => {
    const summary = getDruidProgressionSummary(8, '2014');

    expect(summary).toMatchObject({
      className: 'Druid',
      edition: '2014',
      level: 8,
      spellcastingLevel: 8,
      wildShapeUses: 2,
      wildShapeLimit: 'CR 1 beast forms',
      subclassChoiceLevel: 2,
      subclassFeatureLevels: [2, 6, 10, 14],
    });
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual(expect.arrayContaining(['wild_shape_improvement_8', 'ability_score_improvement_8']));
    expect(summary.activeFeatures.map(feature => feature.key)).toEqual(expect.arrayContaining(['spellcasting', 'wild_shape', 'druid_circle']));
    expect(summary.nextFeatures.map(feature => feature.key)).toContain('druid_circle_feature_10');
  });

  test('summarises active 2024 Druid progression', () => {
    const summary = getDruidProgressionSummary(7, '2024');

    expect(summary).toMatchObject({
      className: 'Druid',
      edition: '2024',
      level: 7,
      spellcastingLevel: 7,
      wildShapeUses: 2,
      wildShapeLimit: '2024 Wild Shape forms online',
      subclassChoiceLevel: 3,
      subclassFeatureLevels: [3, 6, 10, 14],
    });
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('elemental_fury');
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['primal_order', 'subclass', 'elemental_fury']));
  });

  test('includes active choices at higher levels', () => {
    const activeChoiceTypes = getActiveDruidFeatures(12, '2024')
      .filter(feature => feature.type === 'choice')
      .map(feature => feature.choiceType);

    expect(activeChoiceTypes).toEqual(expect.arrayContaining(['primal_order', 'subclass', 'elemental_fury', 'asi_or_feat']));
  });
});
