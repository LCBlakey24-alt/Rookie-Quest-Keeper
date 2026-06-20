import {
  CLERIC_ASI_LEVELS,
  CLERIC_SUBCLASS_FEATURE_LEVELS,
  getActiveClericFeatures,
  getClericChannelDivinityUses,
  getClericChoicesForLevel,
  getClericDestroyUndeadCR,
  getClericFeaturesForLevel,
  getClericProgressionSummary,
  getClericSpellcastingLevel,
  getClericSubclassChoiceLevel,
  getNextClericFeatures,
  normaliseClericRulesEdition,
} from './clericProgression';

describe('Cleric progression helpers', () => {
  test('normalises rules editions', () => {
    expect(normaliseClericRulesEdition('2014')).toBe('2014');
    expect(normaliseClericRulesEdition('2024')).toBe('2024');
    expect(normaliseClericRulesEdition('dnd-2024')).toBe('2024');
    expect(normaliseClericRulesEdition()).toBe('2014');
  });

  test('exposes Cleric subclass and ASI levels', () => {
    expect(CLERIC_SUBCLASS_FEATURE_LEVELS).toEqual([1, 2, 6, 8, 17]);
    expect(CLERIC_ASI_LEVELS).toEqual([4, 8, 12, 16, 19]);
  });

  test('uses full caster spellcasting level', () => {
    expect(getClericSpellcastingLevel(1)).toBe(1);
    expect(getClericSpellcastingLevel(10)).toBe(10);
    expect(getClericSpellcastingLevel(20)).toBe(20);
  });

  test('calculates Channel Divinity uses by edition', () => {
    expect(getClericChannelDivinityUses(1, '2014')).toBe(0);
    expect(getClericChannelDivinityUses(2, '2014')).toBe(1);
    expect(getClericChannelDivinityUses(6, '2014')).toBe(2);
    expect(getClericChannelDivinityUses(18, '2014')).toBe(3);
    expect(getClericChannelDivinityUses(2, '2024')).toBe(2);
    expect(getClericChannelDivinityUses(9, '2024')).toBe(5);
  });

  test('calculates Destroy Undead/Sear Undead scaling', () => {
    expect(getClericDestroyUndeadCR(4, '2014')).toBe(null);
    expect(getClericDestroyUndeadCR(5, '2014')).toBe('1/2');
    expect(getClericDestroyUndeadCR(8, '2014')).toBe('1');
    expect(getClericDestroyUndeadCR(17, '2014')).toBe('4');
    expect(getClericDestroyUndeadCR(4, '2024')).toBe(null);
    expect(getClericDestroyUndeadCR(5, '2024')).toBe('scales with Cleric level');
  });

  test('uses different subclass choice levels by edition', () => {
    expect(getClericSubclassChoiceLevel('2014')).toBe(1);
    expect(getClericSubclassChoiceLevel('2024')).toBe(3);
  });

  test('returns 2014 Cleric features and choices', () => {
    expect(getClericFeaturesForLevel(1, '2014').map(feature => feature.key)).toEqual(['spellcasting', 'divine_domain']);
    expect(getClericChoicesForLevel(1, '2014').map(feature => feature.choiceType)).toEqual(['subclass']);
    expect(getActiveClericFeatures(2, '2014').map(feature => feature.key)).toEqual(expect.arrayContaining(['spellcasting', 'divine_domain', 'channel_divinity']));
  });

  test('returns 2024 Cleric features and choices', () => {
    expect(getClericFeaturesForLevel(1, '2024').map(feature => feature.key)).toEqual(['spellcasting', 'divine_order']);
    expect(getClericChoicesForLevel(3, '2024').map(feature => feature.choiceType)).toEqual(['subclass']);
    expect(getActiveClericFeatures(7, '2024').map(feature => feature.key)).toEqual(expect.arrayContaining(['channel_divinity', 'cleric_subclass', 'blessed_strikes']));
  });

  test('returns next Cleric features', () => {
    expect(getNextClericFeatures(1, '2014').map(feature => feature.key)).toEqual(expect.arrayContaining(['channel_divinity', 'divine_domain_feature']));
    expect(getNextClericFeatures(20, '2024')).toEqual([]);
  });

  test('summarises 2014 Cleric progression', () => {
    const summary = getClericProgressionSummary(8, '2014');

    expect(summary.className).toBe('Cleric');
    expect(summary.edition).toBe('2014');
    expect(summary.level).toBe(8);
    expect(summary.spellcastingLevel).toBe(8);
    expect(summary.channelDivinityUses).toBe(2);
    expect(summary.destroyUndeadCR).toBe('1');
    expect(summary.subclassChoiceLevel).toBe(1);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual(expect.arrayContaining(['ability_score_improvement_8', 'destroy_undead_1']));
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['subclass', 'asi_or_feat']));
  });

  test('summarises 2024 Cleric progression', () => {
    const summary = getClericProgressionSummary(7, '2024');

    expect(summary.className).toBe('Cleric');
    expect(summary.edition).toBe('2024');
    expect(summary.level).toBe(7);
    expect(summary.spellcastingLevel).toBe(7);
    expect(summary.channelDivinityUses).toBe(4);
    expect(summary.destroyUndeadCR).toBe('scales with Cleric level');
    expect(summary.subclassChoiceLevel).toBe(3);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('blessed_strikes');
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['divine_order', 'subclass', 'blessed_strikes']));
  });
});
