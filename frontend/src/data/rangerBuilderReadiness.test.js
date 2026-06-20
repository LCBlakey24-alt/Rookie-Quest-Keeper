import { getRangerBuilderChoiceSummary } from './rangerBuilderChoiceSummary';
import { getRangerBuilderOptions, isValidRangerSubclass, validateRangerBuilderSelections } from './rangerBuilderOptions';
import { getRangerBuilderReadiness } from './rangerBuilderReadiness';
import { getRangerSubclassOptions, getRangerSubclassSummary } from './rangerSubclasses';

describe('Ranger builder options and readiness', () => {
  test('returns subclass options for 2014 and 2024 rules', () => {
    expect(getRangerSubclassOptions('2014').map(option => option.key)).toEqual(expect.arrayContaining(['hunter', 'beast_master', 'gloom_stalker']));
    expect(getRangerSubclassOptions('2024').map(option => option.key)).toEqual(expect.arrayContaining(['hunter', 'beast_master', 'gloom_stalker', 'fey_wanderer']));
    expect(getRangerSubclassOptions('2024').map(option => option.key)).not.toContain('horizon_walker');
  });

  test('validates subclass selections by edition', () => {
    expect(isValidRangerSubclass('Hunter', '2014')).toBe(true);
    expect(isValidRangerSubclass('gloom_stalker', '2024')).toBe(true);
    expect(isValidRangerSubclass('Fey Wanderer', '2024')).toBe(true);
    expect(isValidRangerSubclass('Fey Wanderer', '2014')).toBe(false);
  });

  test('summarises subclass features', () => {
    const summary = getRangerSubclassSummary('Hunter', 11, '2024');

    expect(summary.key).toBe('hunter');
    expect(summary.supportedInRuleset).toBe(true);
    expect(summary.activeFeatures.map(feature => feature.level)).toEqual([3, 7, 11]);
    expect(summary.nextFeatures.map(feature => feature.level)).toEqual([15]);
  });

  test('requires 2014 starting choices and later subclass', () => {
    const levelOne = getRangerBuilderChoiceSummary(1, '2014');
    const levelThree = getRangerBuilderChoiceSummary(3, '2014');

    expect(levelOne.sections.map(section => section.key)).toEqual(['favoredEnemy', 'favoredTerrain']);
    expect(levelThree.sections.map(section => section.key)).toEqual(expect.arrayContaining(['favoredEnemy', 'favoredTerrain', 'fightingStyle', 'subclass']));
  });

  test('requires 2024 weapon mastery and fighting style choices', () => {
    const levelTwo = getRangerBuilderOptions(2, '2024');

    expect(levelTwo.needsWeaponMastery).toBe(true);
    expect(levelTwo.needsFightingStyle).toBe(true);
    expect(levelTwo.requiredChoiceLabels).toEqual(expect.arrayContaining(['Weapon Mastery', 'Fighting Style']));
  });

  test('fails readiness when required selections are missing', () => {
    const readiness = getRangerBuilderReadiness({ level: 3, edition: '2014' });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingSections).toEqual(expect.arrayContaining(['Favored Enemy', 'Favored Terrain', 'Fighting Style', 'Subclass']));
    expect(readiness.errors).toEqual(expect.arrayContaining([
      'Choose Favored Enemy.',
      'Choose Favored Terrain.',
      'Choose a Fighting Style.',
      'Choose a Ranger subclass.',
    ]));
  });

  test('passes readiness when 2014 required selections are present', () => {
    const readiness = getRangerBuilderReadiness({
      level: 3,
      edition: '2014',
      favoredEnemy: 'Undead',
      favoredTerrain: 'Forest',
      fightingStyle: 'Archery',
      subclass: 'Hunter',
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.errors).toEqual([]);
    expect(readiness.missingSections).toEqual([]);
  });

  test('passes readiness when 2024 required selections are present', () => {
    const readiness = getRangerBuilderReadiness({
      level: 3,
      edition: '2024',
      weaponMasteries: ['Longbow', 'Shortsword'],
      fightingStyle: 'Two-Weapon Fighting',
      subclass: 'Fey Wanderer',
    });

    expect(readiness.ready).toBe(true);
  });

  test('validates builder selections directly', () => {
    expect(validateRangerBuilderSelections({ level: 3, edition: '2024', weaponMasteries: ['Longbow'], fightingStyle: 'Archery', subclass: 'Hunter' }).valid).toBe(false);
    expect(validateRangerBuilderSelections({ level: 3, edition: '2024', weaponMasteries: ['Longbow', 'Shortsword'], fightingStyle: 'Archery', subclass: 'Hunter' }).valid).toBe(true);
  });
});
