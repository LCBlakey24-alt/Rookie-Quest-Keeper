import {
  getActiveBattleMasterFeatures,
  getBattleMasterManeuverCount,
  getBattleMasterSummary,
  getBattleMasterSuperiorityDiceCount,
  getBattleMasterSuperiorityDie,
  isBattleMasterSubclass,
} from './fighterBattleMaster';

describe('Battle Master Fighter helpers', () => {
  test('detects Battle Master subclass names safely', () => {
    expect(isBattleMasterSubclass('Battle Master')).toBe(true);
    expect(isBattleMasterSubclass('battlemaster')).toBe(true);
    expect(isBattleMasterSubclass('Champion')).toBe(false);
  });

  test('scales superiority dice count by Fighter level', () => {
    expect(getBattleMasterSuperiorityDiceCount(2)).toBe(0);
    expect(getBattleMasterSuperiorityDiceCount(3)).toBe(4);
    expect(getBattleMasterSuperiorityDiceCount(7)).toBe(5);
    expect(getBattleMasterSuperiorityDiceCount(15)).toBe(6);
  });

  test('scales superiority die size at levels 10 and 18', () => {
    expect(getBattleMasterSuperiorityDie(3)).toBe(8);
    expect(getBattleMasterSuperiorityDie(10)).toBe(10);
    expect(getBattleMasterSuperiorityDie(18)).toBe(12);
  });

  test('scales maneuver count by Fighter level', () => {
    expect(getBattleMasterManeuverCount(3)).toBe(3);
    expect(getBattleMasterManeuverCount(7)).toBe(5);
    expect(getBattleMasterManeuverCount(10)).toBe(7);
    expect(getBattleMasterManeuverCount(15)).toBe(9);
  });

  test('tracks active Battle Master features', () => {
    const keys = getActiveBattleMasterFeatures(10, '2014').map(feature => feature.key);

    expect(keys).toEqual([
      'combat_superiority',
      'student_of_war',
      'know_your_enemy',
      'improved_combat_superiority_d10',
    ]);
  });

  test('summarises 2024 Battle Master resources and unlocks', () => {
    const summary = getBattleMasterSummary(15, '2024');

    expect(summary.edition).toBe('2024');
    expect(summary.superiorityDie).toBe(10);
    expect(summary.superiorityDice).toBe(6);
    expect(summary.maneuverCount).toBe(9);
    expect(summary.currentLevelFeatures.map(feature => feature.key)).toEqual(['relentless']);
  });
});
