import { getBarbarianClassLevel, getBarbarianSheetSummary } from './barbarianSheetSummary';

describe('Barbarian sheet summary', () => {
  test('summarises core level 5 Barbarian combat tools', () => {
    const summary = getBarbarianSheetSummary({ character_class: 'Barbarian', level: 5, constitution: 16, dexterity: 14, rules_edition: '2014' });

    expect(summary.className).toBe('Barbarian');
    expect(summary.level).toBe(5);
    expect(summary.rageUses).toBe(3);
    expect(summary.rageDamageBonus).toBe(2);
    expect(summary.unarmoredDefenseAc).toBe(15);
    expect(summary.recklessAttack).toBe(true);
    expect(summary.extraAttack).toBe(true);
  });

  test('uses multiclass Barbarian level before total level', () => {
    expect(getBarbarianClassLevel({ character_class: 'Fighter', level: 9, class_levels: { Barbarian: 3 } })).toBe(3);
  });

  test('labels 2024 Brutal Strike at level 9', () => {
    const summary = getBarbarianSheetSummary({ character_class: 'Barbarian', level: 9, rules_edition: '2024' });

    expect(summary.edition).toBe('2024');
    expect(summary.brutalCriticalLabel).toBe('Brutal Strike online');
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('brutal_strike');
  });

  test('adds supported subclass features and upcoming subclass unlocks', () => {
    const summary = getBarbarianSheetSummary({ character_class: 'Barbarian', subclass: 'Path of the World Tree', level: 6, rules_edition: '2024' });

    expect(summary.subclassKey).toBe('world_tree');
    expect(summary.subclassLabel).toBe('Path of the World Tree');
    expect(summary.subclassSupportedInRuleset).toBe(true);
    expect(summary.subclassFeatures.map(feature => feature.key)).toContain('branches_of_the_tree');
    expect(summary.nextSubclassFeatures.map(feature => feature.key)).toContain('battering_roots');
  });

});
