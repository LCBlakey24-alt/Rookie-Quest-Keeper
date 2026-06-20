import {
  getActiveMonkFeatures,
  getMonkChoicesForLevel,
  getMonkDisciplineName,
  getMonkDisciplinePoints,
  getMonkMartialArtsDie,
  getMonkProgressionSummary,
  getMonkUnarmoredMovementBonus,
  normaliseMonkRulesEdition,
} from './monkProgression';

describe('Monk progression helpers', () => {
  test('normalises supported rules editions', () => {
    expect(normaliseMonkRulesEdition('2014')).toBe('2014');
    expect(normaliseMonkRulesEdition('5e 2024')).toBe('2024');
    expect(normaliseMonkRulesEdition()).toBe('2014');
  });

  test('returns 2014 Martial Arts die progression', () => {
    expect(getMonkMartialArtsDie(1, '2014')).toBe('d4');
    expect(getMonkMartialArtsDie(5, '2014')).toBe('d6');
    expect(getMonkMartialArtsDie(11, '2014')).toBe('d8');
    expect(getMonkMartialArtsDie(17, '2014')).toBe('d10');
  });

  test('returns 2024 Martial Arts die progression', () => {
    expect(getMonkMartialArtsDie(1, '2024')).toBe('d6');
    expect(getMonkMartialArtsDie(5, '2024')).toBe('d8');
    expect(getMonkMartialArtsDie(11, '2024')).toBe('d10');
    expect(getMonkMartialArtsDie(17, '2024')).toBe('d12');
  });

  test('returns Ki or Discipline resource naming and points', () => {
    expect(getMonkDisciplineName('2014')).toBe('Ki Points');
    expect(getMonkDisciplineName('2024')).toBe('Discipline Points');
    expect(getMonkDisciplinePoints(1)).toBe(0);
    expect(getMonkDisciplinePoints(2)).toBe(2);
    expect(getMonkDisciplinePoints(20)).toBe(20);
  });

  test('returns unarmored movement bonus scaling', () => {
    expect(getMonkUnarmoredMovementBonus(1)).toBe(0);
    expect(getMonkUnarmoredMovementBonus(2)).toBe(10);
    expect(getMonkUnarmoredMovementBonus(6)).toBe(15);
    expect(getMonkUnarmoredMovementBonus(10)).toBe(20);
    expect(getMonkUnarmoredMovementBonus(14)).toBe(25);
    expect(getMonkUnarmoredMovementBonus(18)).toBe(30);
  });

  test('returns subclass choice at level 3', () => {
    const choices = getMonkChoicesForLevel(3, '2014');

    expect(choices).toEqual([
      expect.objectContaining({ choiceType: 'subclass' }),
    ]);
  });

  test('summarises active Monk features', () => {
    const summary = getMonkProgressionSummary(5, '2024');

    expect(summary.edition).toBe('2024');
    expect(summary.level).toBe(5);
    expect(summary.disciplinePoints).toBe(5);
    expect(summary.martialArtsDie).toBe('d8');
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('extra_attack');
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toContain('stunning_strike');
  });

  test('active features include earlier resource and subclass choices', () => {
    const activeKeys = getActiveMonkFeatures(6, '2014').map(feature => feature.key);

    expect(activeKeys).toContain('ki');
    expect(activeKeys).toContain('monastic_tradition');
    expect(activeKeys).toContain('ki_empowered_strikes');
  });
});
