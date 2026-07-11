import { getFighterBuilderReadiness } from './fighterBuilderReadiness';

describe('Fighter builder readiness', () => {
  test('reports missing level 1 fighting style', () => {
    const readiness = getFighterBuilderReadiness({ level: 1, edition: '2014' });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingSections).toEqual(['Fighting Style']);
    expect(readiness.errors).toContain('Choose a valid Fighter Fighting Style.');
  });

  test('reports ready when 2014 level 1 choices are complete', () => {
    const readiness = getFighterBuilderReadiness({ level: 1, edition: '2014', fightingStyle: 'Archery' });

    expect(readiness.ready).toBe(true);
    expect(readiness.missingSections).toEqual([]);
  });

  test('reports missing 2024 mastery choices', () => {
    const readiness = getFighterBuilderReadiness({ level: 1, edition: '2024', fightingStyle: 'Blind Fighting', weaponMasteries: ['Cleave'] });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingSections).toEqual(['Weapon Mastery']);
  });

  test('reports ready when 2024 level 1 choices are complete', () => {
    const readiness = getFighterBuilderReadiness({
      level: 1,
      edition: '2024',
      fightingStyle: 'Blind Fighting',
      weaponMasteries: ['Cleave', 'Topple', 'Vex'],
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.missingSections).toEqual([]);
  });

  test('reports duplicate 2024 weapon masteries as not ready', () => {
    const readiness = getFighterBuilderReadiness({
      level: 1,
      edition: '2024',
      fightingStyle: 'Blind Fighting',
      weaponMasteries: ['Cleave', 'Cleave', 'Topple'],
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.errors).toContain('Choose unique Weapon Mastery options.');
  });
});
