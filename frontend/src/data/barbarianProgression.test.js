import {
  getActiveBarbarianFeatures,
  getBarbarianBrutalCriticalDice,
  getBarbarianChoicesForLevel,
  getBarbarianProgressionSummary,
  getBarbarianRageDamageBonus,
  getBarbarianRageUses,
  normaliseBarbarianRulesEdition,
} from './barbarianProgression';

describe('Barbarian progression helpers', () => {
  test('normalises rules edition', () => {
    expect(normaliseBarbarianRulesEdition('2014')).toBe('2014');
    expect(normaliseBarbarianRulesEdition('2024')).toBe('2024');
    expect(normaliseBarbarianRulesEdition('dnd-2024')).toBe('2024');
  });

  test('calculates 2014 rage uses including unlimited level 20 rage', () => {
    expect(getBarbarianRageUses(1, '2014')).toBe(2);
    expect(getBarbarianRageUses(3, '2014')).toBe(3);
    expect(getBarbarianRageUses(12, '2014')).toBe(5);
    expect(getBarbarianRageUses(20, '2014')).toBe(Infinity);
  });

  test('calculates 2024 rage uses without unlimited level 20 rage', () => {
    expect(getBarbarianRageUses(1, '2024')).toBe(2);
    expect(getBarbarianRageUses(6, '2024')).toBe(4);
    expect(getBarbarianRageUses(17, '2024')).toBe(6);
    expect(getBarbarianRageUses(20, '2024')).toBe(6);
  });

  test('calculates rage damage bonus by level', () => {
    expect(getBarbarianRageDamageBonus(1)).toBe(2);
    expect(getBarbarianRageDamageBonus(9)).toBe(3);
    expect(getBarbarianRageDamageBonus(16)).toBe(4);
  });

  test('calculates brutal critical dice for 2014 and 2024', () => {
    expect(getBarbarianBrutalCriticalDice(8, '2014')).toBe(0);
    expect(getBarbarianBrutalCriticalDice(9, '2014')).toBe(1);
    expect(getBarbarianBrutalCriticalDice(17, '2014')).toBe(3);
    expect(getBarbarianBrutalCriticalDice(9, '2024')).toBe(1);
    expect(getBarbarianBrutalCriticalDice(20, '2024')).toBe(1);
  });

  test('returns subclass choice at level 3', () => {
    expect(getBarbarianChoicesForLevel(3, '2014').map(choice => choice.choiceType)).toContain('subclass');
    expect(getBarbarianChoicesForLevel(3, '2024').map(choice => choice.choiceType)).toContain('subclass');
  });

  test('keeps only the latest replacing 2014 brutal critical feature active', () => {
    const active = getActiveBarbarianFeatures(17, '2014').map(feature => feature.key);

    expect(active).toContain('brutal_critical_3');
    expect(active).not.toContain('brutal_critical_1');
    expect(active).not.toContain('brutal_critical_2');
  });

  test('summarises a level 5 Barbarian', () => {
    const summary = getBarbarianProgressionSummary(5, '2014');

    expect(summary.level).toBe(5);
    expect(summary.rageUses).toBe(3);
    expect(summary.rageDamageBonus).toBe(2);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual(['extra_attack', 'fast_movement']);
  });
});
