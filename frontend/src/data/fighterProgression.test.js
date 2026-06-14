import {
  getActiveFighterFeatures,
  getFighterAttacksPerAction,
  getFighterChoicesForLevel,
  getFighterFeaturesForLevel,
  getFighterProgressionSummary,
} from './fighterProgression';

describe('Fighter progression helpers', () => {
  test('tracks Fighter attack scaling', () => {
    expect(getFighterAttacksPerAction(4)).toBe(1);
    expect(getFighterAttacksPerAction(5)).toBe(2);
    expect(getFighterAttacksPerAction(11)).toBe(3);
    expect(getFighterAttacksPerAction(20)).toBe(4);
  });

  test('2014 Fighter includes the extra class choice levels', () => {
    expect(getFighterChoicesForLevel(1, '2014').map(feature => feature.choiceType)).toEqual(['fighting_style']);
    expect(getFighterChoicesForLevel(3, '2014').map(feature => feature.choiceType)).toEqual(['subclass']);
    expect(getFighterChoicesForLevel(6, '2014').map(feature => feature.choiceType)).toEqual(['asi_or_feat']);
    expect(getFighterChoicesForLevel(14, '2014').map(feature => feature.choiceType)).toEqual(['asi_or_feat']);
    expect(getFighterChoicesForLevel(19, '2014').map(feature => feature.choiceType)).toEqual(['asi_or_feat']);
  });

  test('2024 Fighter includes weapon mastery and tactical unlocks', () => {
    expect(getFighterFeaturesForLevel(1, '2024').map(feature => feature.key)).toEqual([
      'fighting_style',
      'second_wind',
      'weapon_mastery_3',
    ]);
    expect(getFighterFeaturesForLevel(2, '2024').map(feature => feature.key)).toEqual([
      'action_surge',
      'tactical_mind',
    ]);
    expect(getFighterFeaturesForLevel(5, '2024').map(feature => feature.key)).toEqual([
      'extra_attack_1',
      'tactical_shift',
    ]);
  });

  test('replaced Fighter features collapse to the newest version', () => {
    const featureKeys = getActiveFighterFeatures(20, '2014').map(feature => feature.key);

    expect(featureKeys).toContain('extra_attack_3');
    expect(featureKeys).not.toContain('extra_attack_1');
    expect(featureKeys).not.toContain('extra_attack_2');
    expect(featureKeys).toContain('action_surge_2');
    expect(featureKeys).not.toContain('action_surge');
    expect(featureKeys).toContain('indomitable_3');
    expect(featureKeys).not.toContain('indomitable_1');
  });

  test('progression summary gives current level data', () => {
    const summary = getFighterProgressionSummary(17, '2024');

    expect(summary.edition).toBe('2024');
    expect(summary.attacksPerAction).toBe(3);
    expect(summary.actionSurgeUses).toBe(2);
    expect(summary.indomitableUses).toBe(3);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual([
      'action_surge_2',
      'indomitable_3',
    ]);
  });
});
