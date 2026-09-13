import {
  getActiveWarlockFeatures,
  getNextWarlockFeatures,
  getWarlockChoicesForLevel,
  getWarlockFeaturesForLevel,
  getWarlockInvocationCount,
  getWarlockMysticArcanumLevels,
  getWarlockPactMagicSlotLevel,
  getWarlockPactMagicSlots,
  getWarlockProgressionSummary,
  getWarlockSubclassChoiceLevel,
  getWarlockSubclassFeatureLevels,
  normaliseWarlockRulesEdition,
} from './warlockProgression';

describe('Warlock progression helpers', () => {
  test('normalises Warlock rules editions', () => {
    expect(normaliseWarlockRulesEdition('2014')).toBe('2014');
    expect(normaliseWarlockRulesEdition('2024')).toBe('2024');
    expect(normaliseWarlockRulesEdition('D&D 2024')).toBe('2024');
    expect(normaliseWarlockRulesEdition()).toBe('2014');
  });

  test('tracks Pact Magic slot count and slot level', () => {
    expect(getWarlockPactMagicSlots(0)).toBe(0);
    expect(getWarlockPactMagicSlots(1)).toBe(1);
    expect(getWarlockPactMagicSlots(2)).toBe(2);
    expect(getWarlockPactMagicSlots(11)).toBe(3);
    expect(getWarlockPactMagicSlots(17)).toBe(4);

    expect(getWarlockPactMagicSlotLevel(1)).toBe(1);
    expect(getWarlockPactMagicSlotLevel(3)).toBe(2);
    expect(getWarlockPactMagicSlotLevel(5)).toBe(3);
    expect(getWarlockPactMagicSlotLevel(7)).toBe(4);
    expect(getWarlockPactMagicSlotLevel(9)).toBe(5);
  });

  test('tracks Eldritch Invocation counts by edition', () => {
    expect(getWarlockInvocationCount(1, '2014')).toBe(0);
    expect(getWarlockInvocationCount(2, '2014')).toBe(2);
    expect(getWarlockInvocationCount(5, '2014')).toBe(3);
    expect(getWarlockInvocationCount(18, '2014')).toBe(8);

    expect(getWarlockInvocationCount(1, '2024')).toBe(1);
    expect(getWarlockInvocationCount(2, '2024')).toBe(3);
    expect(getWarlockInvocationCount(5, '2024')).toBe(5);
    expect(getWarlockInvocationCount(7, '2024')).toBe(6);
    expect(getWarlockInvocationCount(9, '2024')).toBe(7);
    expect(getWarlockInvocationCount(12, '2024')).toBe(8);
    expect(getWarlockInvocationCount(15, '2024')).toBe(9);
    expect(getWarlockInvocationCount(18, '2024')).toBe(10);
  });

  test('tracks subclass timing by edition', () => {
    expect(getWarlockSubclassChoiceLevel('2014')).toBe(1);
    expect(getWarlockSubclassChoiceLevel('2024')).toBe(3);
    expect(getWarlockSubclassFeatureLevels('2014')).toEqual([1, 6, 10, 14]);
    expect(getWarlockSubclassFeatureLevels('2024')).toEqual([3, 6, 10, 14]);
  });

  test('tracks Mystic Arcanum milestones', () => {
    expect(getWarlockMysticArcanumLevels(10)).toEqual([]);
    expect(getWarlockMysticArcanumLevels(11)).toEqual([11]);
    expect(getWarlockMysticArcanumLevels(15)).toEqual([11, 13, 15]);
    expect(getWarlockMysticArcanumLevels(20)).toEqual([11, 13, 15, 17]);
  });

  test('returns 2014 Warlock level features and choices', () => {
    expect(getWarlockFeaturesForLevel(1, '2014').map(feature => feature.key)).toEqual(['otherworldly_patron', 'pact_magic']);
    expect(getWarlockChoicesForLevel(1, '2014').map(feature => feature.choiceType)).toEqual(['subclass']);
    expect(getActiveWarlockFeatures(3, '2014').map(feature => feature.key)).toEqual(expect.arrayContaining([
      'otherworldly_patron',
      'pact_magic',
      'eldritch_invocations',
      'pact_boon',
    ]));
    expect(getNextWarlockFeatures(3, '2014').map(feature => feature.key)).toEqual(['ability_score_improvement_4']);
  });

  test('returns 2024 Warlock level features without a separate Pact Boon', () => {
    expect(getWarlockFeaturesForLevel(1, '2024').map(feature => feature.key)).toEqual(['pact_magic', 'eldritch_invocations']);
    expect(getWarlockChoicesForLevel(1, '2024').map(feature => feature.choiceType)).toEqual(['eldritch_invocations']);
    expect(getWarlockFeaturesForLevel(3, '2024').map(feature => feature.key)).toEqual(['warlock_subclass']);
    expect(getWarlockChoicesForLevel(3, '2024').map(feature => feature.choiceType)).toEqual(['subclass']);
    expect(getActiveWarlockFeatures(20, '2024').map(feature => feature.key)).not.toContain('pact_boon');
  });

  test('2024 Warlock has Contact Patron at 9, Epic Boon at 19, and Eldritch Master at 20', () => {
    expect(getWarlockFeaturesForLevel(9, '2024').map(feature => feature.key)).toContain('contact_patron');
    expect(getWarlockFeaturesForLevel(19, '2024').map(feature => feature.key)).toContain('epic_boon_or_asi');
    expect(getWarlockFeaturesForLevel(20, '2024').map(feature => feature.key)).toEqual(['eldritch_master']);
  });

  test('summarises 2014 Warlock progression', () => {
    const summary = getWarlockProgressionSummary(11, '2014');

    expect(summary).toMatchObject({
      className: 'Warlock',
      edition: '2014',
      level: 11,
      pactMagicSlots: 3,
      pactMagicSlotLevel: 5,
      invocationCount: 5,
      mysticArcanumLevels: [11],
      subclassChoiceLevel: 1,
      subclassFeatureLevels: [1, 6, 10, 14],
    });
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('mystic_arcanum_6');
    expect(summary.choices.map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['subclass', 'eldritch_invocations', 'pact_boon', 'asi_or_feat']));
  });

  test('summarises 2024 Warlock progression', () => {
    const summary = getWarlockProgressionSummary(7, '2024');

    expect(summary).toMatchObject({
      className: 'Warlock',
      edition: '2024',
      level: 7,
      pactMagicSlots: 2,
      pactMagicSlotLevel: 4,
      invocationCount: 6,
      mysticArcanumLevels: [],
      subclassChoiceLevel: 3,
      subclassFeatureLevels: [3, 6, 10, 14],
    });
    expect(summary.activeFeatures.map(feature => feature.key)).not.toContain('pact_boon');
    expect(summary.nextFeatures.map(feature => feature.key)).toEqual(['ability_score_improvement_8']);
  });
});
