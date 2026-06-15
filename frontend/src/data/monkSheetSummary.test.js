import { getMonkSheetSummary } from './monkSheetSummary';

describe('Monk sheet summary', () => {
  test('returns basic 2014 Monk sheet data', () => {
    const summary = getMonkSheetSummary({ character_class: 'Monk', level: 5, dexterity: 16, wisdom: 14, subclass: 'Way of the Open Hand' });

    expect(summary.className).toBe('Monk');
    expect(summary.edition).toBe('2014');
    expect(summary.level).toBe(5);
    expect(summary.isMonk).toBe(true);
    expect(summary.subclassKey).toBe('open_hand');
    expect(summary.subclassLabel).toBe('Way of the Open Hand');
    expect(summary.subclassRole).toBe('Control striker');
    expect(summary.disciplineName).toBe('Ki Points');
    expect(summary.disciplinePoints).toBe(5);
    expect(summary.disciplineLabel).toBe('5 Ki Points');
    expect(summary.martialArtsDie).toBe('d6');
    expect(summary.martialArtsLabel).toBe('Martial Arts d6');
    expect(summary.unarmoredDefenseAc).toBe(15);
    expect(summary.unarmoredMovementBonus).toBe(10);
    expect(summary.stunningStrike).toBe(true);
    expect(summary.extraAttack).toBe(true);
  });

  test('returns 2024 Monk terminology and die scaling', () => {
    const summary = getMonkSheetSummary({ character_class: 'Monk', level: 11, rules_edition: '2024', dexterity: 18, wisdom: 16, subclass: 'Warrior of Mercy' });

    expect(summary.edition).toBe('2024');
    expect(summary.disciplineName).toBe('Discipline Points');
    expect(summary.disciplinePoints).toBe(11);
    expect(summary.disciplineLabel).toBe('11 Discipline Points');
    expect(summary.martialArtsDie).toBe('d10');
    expect(summary.unarmoredDefenseAc).toBe(17);
    expect(summary.unarmoredMovementLabel).toBe('+20 ft.');
    expect(summary.subclassKey).toBe('mercy');
  });

  test('shows no resource before level 2 and subclass prompt at level 3', () => {
    const levelOne = getMonkSheetSummary({ character_class: 'Monk', level: 1 });
    const levelThree = getMonkSheetSummary({ character_class: 'Monk', level: 3 });

    expect(levelOne.disciplinePoints).toBe(0);
    expect(levelOne.disciplineLabel).toBe('Not yet');
    expect(levelOne.disciplineActions).toEqual([]);
    expect(levelThree.subclassLabel).toBe('Choose/record Monk Subclass');
  });

  test('supports Monk multiclass levels', () => {
    const summary = getMonkSheetSummary({ character_class: 'Fighter', level: 12, class_levels: { Fighter: 8, monk: 4 } });

    expect(summary.isMonk).toBe(true);
    expect(summary.level).toBe(4);
    expect(summary.disciplinePoints).toBe(4);
    expect(summary.martialArtsDie).toBe('d4');
  });

  test('marks mismatched subclass ruleset as unsupported', () => {
    const summary = getMonkSheetSummary({ character_class: 'Monk', level: 6, rules_edition: '2014', subclass: 'Warrior of Mercy' });

    expect(summary.subclassSupportedInRuleset).toBe(false);
    expect(summary.subclassLabel).toBe('Warrior of Mercy');
  });

  test('includes current, active, and next features', () => {
    const summary = getMonkSheetSummary({ character_class: 'Monk', level: 5 });

    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual(expect.arrayContaining(['extra_attack', 'stunning_strike']));
    expect(summary.activeFeatures.map(feature => feature.key)).toContain('martial_arts');
    expect(summary.nextFeatures.length).toBeGreaterThan(0);
  });
});
