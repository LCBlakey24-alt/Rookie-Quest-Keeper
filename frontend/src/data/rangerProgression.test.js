import {
  getActiveRangerFeatures,
  getNextRangerFeatures,
  getRangerChoicesForLevel,
  getRangerFavoredEnemyUses,
  getRangerKnownSpellsHint,
  getRangerProgressionSummary,
  getRangerSpellcastingLevel,
  normaliseRangerRulesEdition,
} from './rangerProgression';

describe('Ranger progression helpers', () => {
  test('normalises rules editions', () => {
    expect(normaliseRangerRulesEdition('2014')).toBe('2014');
    expect(normaliseRangerRulesEdition('5e 2024')).toBe('2024');
    expect(normaliseRangerRulesEdition()).toBe('2014');
  });

  test('returns Ranger spellcasting progression level', () => {
    expect(getRangerSpellcastingLevel(1)).toBe(0);
    expect(getRangerSpellcastingLevel(2)).toBe(1);
    expect(getRangerSpellcastingLevel(5)).toBe(3);
    expect(getRangerSpellcastingLevel(20)).toBe(10);
  });

  test('returns spellcasting labels by edition', () => {
    expect(getRangerKnownSpellsHint(1, '2014')).toBe('No Ranger spellcasting yet');
    expect(getRangerKnownSpellsHint(2, '2014')).toBe('Known Ranger spells');
    expect(getRangerKnownSpellsHint(2, '2024')).toBe('Prepared Ranger spell list');
  });

  test('returns Favored Enemy support values', () => {
    expect(getRangerFavoredEnemyUses(1, '2014')).toBe(1);
    expect(getRangerFavoredEnemyUses(1, '2024')).toBe(2);
    expect(getRangerFavoredEnemyUses(10, '2024')).toBe(5);
    expect(getRangerFavoredEnemyUses(20, '2024')).toBe(10);
  });

  test('returns 2014 level choices', () => {
    expect(getRangerChoicesForLevel(1, '2014').map(choice => choice.choiceType)).toEqual(['favored_enemy', 'favored_terrain']);
    expect(getRangerChoicesForLevel(2, '2014').map(choice => choice.choiceType)).toContain('fighting_style');
    expect(getRangerChoicesForLevel(3, '2014').map(choice => choice.choiceType)).toContain('subclass');
  });

  test('returns 2024 level choices', () => {
    expect(getRangerChoicesForLevel(1, '2024').map(choice => choice.choiceType)).toContain('weapon_mastery');
    expect(getRangerChoicesForLevel(3, '2024').map(choice => choice.choiceType)).toContain('subclass');
  });

  test('summarises active 2024 Ranger features', () => {
    const summary = getRangerProgressionSummary(5, '2024');

    expect(summary.edition).toBe('2024');
    expect(summary.level).toBe(5);
    expect(summary.spellcastingLevel).toBe(3);
    expect(summary.spellcastingHint).toBe('Prepared Ranger spell list');
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('extra_attack');
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('favored_enemy');
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('spellcasting');
  });

  test('returns next unlocks', () => {
    const nextKeys = getNextRangerFeatures(5, '2014').map(feature => feature.key);

    expect(nextKeys).toContain('favored_enemy_improvement');
  });

  test('includes earlier active choices at higher levels', () => {
    const activeKeys = getActiveRangerFeatures(10, '2014').map(feature => feature.key);

    expect(activeKeys).toContain('favored_enemy');
    expect(activeKeys).toContain('natural_explorer');
    expect(activeKeys).toContain('ranger_archetype');
  });
});
