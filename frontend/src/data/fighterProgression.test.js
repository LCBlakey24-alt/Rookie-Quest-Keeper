import { CLASS_FEATURES } from './classFeatures';
import { ASI_LEVELS as CHARACTER_RULE_ASI_LEVELS } from './characterRules5e';
import { CLASS_ASI_LEVELS } from './classLevelRules';
import { ASI_LEVELS as LEVEL_UP_ASI_LEVELS } from './levelUpData';

const featureNamesAt = (features, level) => features.filter(feature => feature.level === level).map(feature => feature.name);

describe('fighter progression tables', () => {
  test('2014 fighter has the expected major 1-20 milestones', () => {
    const features = CLASS_FEATURES.fighter.features;

    expect(featureNamesAt(features, 1)).toEqual(expect.arrayContaining(['Fighting Style', 'Second Wind']));
    expect(featureNamesAt(features, 2)).toContain('Action Surge');
    expect(featureNamesAt(features, 3)).toContain('Martial Archetype');
    expect(featureNamesAt(features, 5)).toContain('Extra Attack');
    expect(featureNamesAt(features, 9)).toContain('Indomitable');
    expect(featureNamesAt(features, 11)).toContain('Extra Attack (2)');
    expect(featureNamesAt(features, 17)).toEqual(expect.arrayContaining(['Action Surge (2 uses)', 'Indomitable (3 uses)']));
    expect(featureNamesAt(features, 20)).toContain('Extra Attack (3)');
  });

  test('2024 fighter has tactical and weapon mastery milestones', () => {
    const features = CLASS_FEATURES.fighter.features_2024;

    expect(featureNamesAt(features, 1)).toEqual(expect.arrayContaining(['Fighting Style', 'Second Wind', 'Weapon Mastery']));
    expect(featureNamesAt(features, 2)).toEqual(expect.arrayContaining(['Action Surge', 'Tactical Mind']));
    expect(featureNamesAt(features, 5)).toEqual(expect.arrayContaining(['Extra Attack', 'Tactical Shift']));
    expect(featureNamesAt(features, 9)).toEqual(expect.arrayContaining(['Indomitable', 'Tactical Master']));
    expect(featureNamesAt(features, 13)).toContain('Studied Attacks');
    expect(featureNamesAt(features, 20)).toContain('Extra Attack (3)');
  });

  test('fighter subclasses expose Champion, Battle Master, and Eldritch Knight support', () => {
    const subclasses = CLASS_FEATURES.fighter.subclasses;

    expect(Object.keys(subclasses)).toEqual(expect.arrayContaining(['champion', 'battle_master', 'eldritch_knight']));
    expect(subclasses.champion.features.map(feature => feature.name)).toEqual(expect.arrayContaining(['Improved Critical', 'Survivor']));
    expect(subclasses.battle_master.maneuvers.length).toBeGreaterThanOrEqual(12);
    expect(subclasses.eldritch_knight.features.map(feature => feature.name)).toEqual(expect.arrayContaining(['Spellcasting', 'War Magic', 'Improved War Magic']));
  });

  test('fighter ASI / feat cadence is consistent across character creation and level-up helpers', () => {
    const fighterAsis = [4, 6, 8, 12, 14, 16, 19];

    expect(CHARACTER_RULE_ASI_LEVELS.Fighter).toEqual(fighterAsis);
    expect(CLASS_ASI_LEVELS.Fighter).toEqual(fighterAsis);
    expect(LEVEL_UP_ASI_LEVELS.Fighter).toEqual(fighterAsis);
  });

  test.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [10, 2],
    [11, 3],
    [19, 3],
    [20, 4],
  ])('fighter level %i has %i attack(s) per Attack action milestone coverage', (level, attacks) => {
    const features = CLASS_FEATURES.fighter.features.filter(feature => feature.level <= level);
    const names = features.map(feature => feature.name);
    const inferredAttacks = names.includes('Extra Attack (3)') ? 4
      : names.includes('Extra Attack (2)') ? 3
        : names.includes('Extra Attack') ? 2
          : 1;

    expect(inferredAttacks).toBe(attacks);
  });
});
