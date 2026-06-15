import {
  getBarbarianBuilderOptions,
  getBarbarianBuilderReadiness,
  getBarbarianFinalStatus,
  getBarbarianProgressionSummary,
  getBarbarianSheetSummary,
  isBarbarianCharacter,
} from './barbarianPackage';

describe('completed Barbarian package', () => {
  test('exposes the Barbarian helpers needed by the app', () => {
    expect(isBarbarianCharacter({ character_class: 'Barbarian' })).toBe(true);
    expect(getBarbarianProgressionSummary(5, '2014').rageUses).toBe(3);
    expect(getBarbarianBuilderOptions(1, '2024').weaponMasteryChoices).toBe(2);
    expect(getBarbarianSheetSummary({ character_class: 'Barbarian', level: 5 }).extraAttack).toBe(true);
  });

  test('exposes readiness and final status helpers', () => {
    const readiness = getBarbarianBuilderReadiness({ level: 3, edition: '2014', subclass: 'Path of the Berserker' });
    const status = getBarbarianFinalStatus({ character: { character_class: 'Barbarian', level: 3 }, level: 3, edition: '2014', subclass: 'Path of the Berserker' });

    expect(readiness.ready).toBe(true);
    expect(status.ready).toBe(true);
  });
});
