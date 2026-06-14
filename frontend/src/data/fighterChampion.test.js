import {
  getActiveChampionFeatures,
  getChampionChoicesForLevel,
  getChampionCriticalRange,
  getChampionFeaturesForLevel,
  getChampionSummary,
  isChampionSubclass,
} from './fighterChampion';

describe('Champion Fighter helpers', () => {
  test('detects Champion subclass names safely', () => {
    expect(isChampionSubclass('Champion')).toBe(true);
    expect(isChampionSubclass('champion_fighter')).toBe(true);
    expect(isChampionSubclass('Battle Master')).toBe(false);
  });

  test('critical range scales at Champion levels 3 and 15', () => {
    expect(getChampionCriticalRange(2)).toEqual({ minimum: 20, label: '20' });
    expect(getChampionCriticalRange(3)).toEqual({ minimum: 19, label: '19–20' });
    expect(getChampionCriticalRange(15)).toEqual({ minimum: 18, label: '18–20' });
  });

  test('2014 Champion unlocks the extra Fighting Style at level 10', () => {
    expect(getChampionChoicesForLevel(10, '2014')).toEqual([
      expect.objectContaining({ key: 'additional_fighting_style', choiceType: 'fighting_style' }),
    ]);
    expect(getChampionChoicesForLevel(7, '2014')).toEqual([]);
  });

  test('2024 Champion unlocks the extra Fighting Style at level 7', () => {
    expect(getChampionChoicesForLevel(7, '2024')).toEqual([
      expect.objectContaining({ key: 'additional_fighting_style', choiceType: 'fighting_style' }),
    ]);
  });

  test('2024 Champion has level 3 and level 10 feature differences', () => {
    expect(getChampionFeaturesForLevel(3, '2024').map(feature => feature.key)).toEqual([
      'improved_critical',
      'remarkable_athlete',
    ]);
    expect(getChampionFeaturesForLevel(10, '2024').map(feature => feature.key)).toEqual(['heroic_warrior']);
  });

  test('active features and summary include critical data', () => {
    const activeKeys = getActiveChampionFeatures(18, '2014').map(feature => feature.key);
    const summary = getChampionSummary(15, '2024');

    expect(activeKeys).toEqual([
      'improved_critical',
      'remarkable_athlete',
      'additional_fighting_style',
      'superior_critical',
      'survivor',
    ]);
    expect(summary.criticalRange).toEqual({ minimum: 18, label: '18–20' });
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('superior_critical');
  });
});
