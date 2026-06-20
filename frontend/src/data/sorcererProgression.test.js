import {
  getActiveSorcererFeatures,
  getNextSorcererFeatures,
  getSorcererChoicesForLevel,
  getSorcererFeaturesForLevel,
  getSorcererMetamagicCount,
  getSorcererMetamagicStartLevel,
  getSorcererProgressionSummary,
  getSorcererSpellcastingLevel,
  getSorcererSubclassChoiceLevel,
  getSorcererSubclassFeatureLevels,
  getSorceryPointMaximum,
  normaliseSorcererRulesEdition,
} from './sorcererProgression';

describe('Sorcerer progression helpers', () => {
  test('normalises Sorcerer rules editions', () => {
    expect(normaliseSorcererRulesEdition('2014')).toBe('2014');
    expect(normaliseSorcererRulesEdition('2024')).toBe('2024');
    expect(normaliseSorcererRulesEdition('D&D 2024')).toBe('2024');
    expect(normaliseSorcererRulesEdition()).toBe('2014');
  });

  test('tracks full-caster spellcasting level and Sorcery Points', () => {
    expect(getSorcererSpellcastingLevel(0)).toBe(0);
    expect(getSorcererSpellcastingLevel(1)).toBe(1);
    expect(getSorcererSpellcastingLevel(9)).toBe(9);

    expect(getSorceryPointMaximum(1)).toBe(0);
    expect(getSorceryPointMaximum(2)).toBe(2);
    expect(getSorceryPointMaximum(10)).toBe(10);
  });

  test('tracks Metamagic counts by edition', () => {
    expect(getSorcererMetamagicStartLevel('2014')).toBe(3);
    expect(getSorcererMetamagicStartLevel('2024')).toBe(2);

    expect(getSorcererMetamagicCount(2, '2014')).toBe(0);
    expect(getSorcererMetamagicCount(3, '2014')).toBe(2);
    expect(getSorcererMetamagicCount(10, '2014')).toBe(3);
    expect(getSorcererMetamagicCount(17, '2014')).toBe(4);

    expect(getSorcererMetamagicCount(1, '2024')).toBe(0);
    expect(getSorcererMetamagicCount(2, '2024')).toBe(2);
    expect(getSorcererMetamagicCount(3, '2024')).toBe(2);
    expect(getSorcererMetamagicCount(10, '2024')).toBe(4);
    expect(getSorcererMetamagicCount(17, '2024')).toBe(6);
  });

  test('tracks subclass timing by edition', () => {
    expect(getSorcererSubclassChoiceLevel('2014')).toBe(1);
    expect(getSorcererSubclassChoiceLevel('2024')).toBe(3);
    expect(getSorcererSubclassFeatureLevels('2014')).toEqual([1, 6, 14, 18]);
    expect(getSorcererSubclassFeatureLevels('2024')).toEqual([3, 6, 14, 18]);
  });

  test('returns 2014 Sorcerer level features and choices', () => {
    expect(getSorcererFeaturesForLevel(1, '2014').map(feature => feature.key)).toEqual(['spellcasting', 'sorcerous_origin']);
    expect(getSorcererChoicesForLevel(1, '2014').map(feature => feature.choiceType)).toEqual(['subclass']);
    expect(getActiveSorcererFeatures(3, '2014').map(feature => feature.key)).toEqual(expect.arrayContaining([
      'spellcasting',
      'sorcerous_origin',
      'font_of_magic',
      'metamagic',
    ]));
    expect(getNextSorcererFeatures(3, '2014').map(feature => feature.key)).toEqual(['ability_score_improvement_4']);
  });

  test('returns 2024 Sorcerer level features and choices', () => {
    expect(getSorcererFeaturesForLevel(1, '2024').map(feature => feature.key)).toEqual(['spellcasting', 'innate_sorcery']);
    expect(getSorcererFeaturesForLevel(2, '2024').map(feature => feature.key)).toEqual(['font_of_magic', 'metamagic']);
    expect(getSorcererChoicesForLevel(2, '2024').map(feature => feature.choiceType)).toEqual(['metamagic']);
    expect(getSorcererFeaturesForLevel(3, '2024').map(feature => feature.key)).toEqual(['sorcerer_subclass']);
    expect(getSorcererChoicesForLevel(3, '2024').map(feature => feature.choiceType)).toEqual(['subclass']);
  });

  test('summarises 2014 Sorcerer progression', () => {
    const summary = getSorcererProgressionSummary(10, '2014');

    expect(summary).toMatchObject({
      className: 'Sorcerer',
      edition: '2014',
      level: 10,
      spellcastingLevel: 10,
      sorceryPointMaximum: 10,
      metamagicCount: 3,
      metamagicStartLevel: 3,
      subclassChoiceLevel: 1,
      subclassFeatureLevels: [1, 6, 14, 18],
    });
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('metamagic');
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['subclass', 'metamagic', 'asi_or_feat']));
  });

  test('summarises 2024 Sorcerer progression', () => {
    const summary = getSorcererProgressionSummary(6, '2024');

    expect(summary).toMatchObject({
      className: 'Sorcerer',
      edition: '2024',
      level: 6,
      spellcastingLevel: 6,
      sorceryPointMaximum: 6,
      metamagicCount: 2,
      metamagicStartLevel: 2,
      subclassChoiceLevel: 3,
      subclassFeatureLevels: [3, 6, 14, 18],
    });
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('subclass_feature_6');
    expect(summary.nextFeatures.map(feature => feature.key)).toEqual(['sorcery_incarnate']);
  });
});
