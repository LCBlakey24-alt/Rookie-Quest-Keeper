import {
  getFighterBuilderOptions,
  getFighterBuilderReadiness,
  getFighterFinalStatus,
  getFighterProgressionSummary,
  isFighterCharacter,
} from './fighterPackage';

describe('completed Fighter package', () => {
  test('exposes the Fighter helpers needed by the app', () => {
    expect(isFighterCharacter({ character_class: 'Fighter' })).toBe(true);
    expect(getFighterProgressionSummary(5, '2014').attacksPerAction).toBe(2);
    expect(getFighterBuilderOptions(1, '2024').weaponMasteryChoices).toBe(3);
  });

  test('exposes readiness and final status helpers', () => {
    const readiness = getFighterBuilderReadiness({
      level: 1,
      edition: '2024',
      fightingStyle: 'Blind Fighting',
      weaponMasteries: ['Cleave', 'Topple', 'Vex'],
    });
    const status = getFighterFinalStatus({
      character: { character_class: 'Fighter', level: 1 },
      level: 1,
      edition: '2014',
      fightingStyle: 'Archery',
    });

    expect(readiness.ready).toBe(true);
    expect(status.ready).toBe(true);
  });
});
