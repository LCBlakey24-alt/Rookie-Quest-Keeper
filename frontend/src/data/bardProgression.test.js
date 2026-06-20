import {
  getActiveBardFeatures,
  getBardChoicesForLevel,
  getBardicInspirationDie,
  getBardicInspirationUses,
  getBardProgressionSummary,
  getBardSpellcastingLevel,
  getNextBardFeatures,
  normaliseBardRulesEdition,
} from './bardProgression';

describe('Bard progression helpers', () => {
  test('normalises rules editions', () => {
    expect(normaliseBardRulesEdition('2014')).toBe('2014');
    expect(normaliseBardRulesEdition('5e 2024')).toBe('2024');
    expect(normaliseBardRulesEdition()).toBe('2014');
  });

  test('returns Bardic Inspiration die scaling', () => {
    expect(getBardicInspirationDie(1, '2014')).toBe('d6');
    expect(getBardicInspirationDie(5, '2014')).toBe('d8');
    expect(getBardicInspirationDie(10, '2014')).toBe('d10');
    expect(getBardicInspirationDie(15, '2014')).toBe('d12');
    expect(getBardicInspirationDie(15, '2024')).toBe('d12');
  });

  test('returns Bardic Inspiration uses from Charisma modifier', () => {
    expect(getBardicInspirationUses(1, 3, '2014')).toBe(3);
    expect(getBardicInspirationUses(1, 0, '2014')).toBe(1);
    expect(getBardicInspirationUses(8, 4, '2024')).toBe(4);
  });

  test('Bard is a full caster', () => {
    expect(getBardSpellcastingLevel(1)).toBe(1);
    expect(getBardSpellcastingLevel(9)).toBe(9);
    expect(getBardSpellcastingLevel(20)).toBe(20);
  });

  test('returns 2014 level choices', () => {
    expect(getBardChoicesForLevel(3, '2014').map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['subclass', 'expertise']));
    expect(getBardChoicesForLevel(10, '2014').map(choice => choice.choiceType)).toEqual(expect.arrayContaining(['expertise', 'magical_secrets']));
  });

  test('returns 2024 level choices', () => {
    expect(getBardChoicesForLevel(2, '2024').map(choice => choice.choiceType)).toContain('expertise');
    expect(getBardChoicesForLevel(3, '2024').map(choice => choice.choiceType)).toContain('subclass');
    expect(getBardChoicesForLevel(10, '2024').map(choice => choice.choiceType)).toContain('magical_secrets');
  });

  test('summarises active Bard features', () => {
    const summary = getBardProgressionSummary(5, '2014', 4);

    expect(summary.edition).toBe('2014');
    expect(summary.level).toBe(5);
    expect(summary.bardicInspirationDie).toBe('d8');
    expect(summary.bardicInspirationUses).toBe(4);
    expect(summary.spellcastingLevel).toBe(5);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('font_of_inspiration');
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('bardic_inspiration');
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('spellcasting');
  });

  test('returns next unlocks', () => {
    const nextKeys = getNextBardFeatures(5, '2014').map(feature => feature.key);

    expect(nextKeys).toContain('countercharm');
  });

  test('includes active features at higher levels', () => {
    const activeKeys = getActiveBardFeatures(18, '2014').map(feature => feature.key);

    expect(activeKeys).toContain('bard_college');
    expect(activeKeys).toContain('magical_secrets');
    expect(activeKeys).toContain('greater_magical_secrets');
  });
});
