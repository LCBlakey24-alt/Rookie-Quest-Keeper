import { getBarbarianFinalStatus } from './barbarianFinalStatus';

describe('Barbarian final status', () => {
  test('combines missing builder choices with sheet summary', () => {
    const status = getBarbarianFinalStatus({ character: { character_class: 'Barbarian', level: 3 }, level: 3, edition: '2014' });

    expect(status.ready).toBe(false);
    expect(status.missingSections).toContain('Subclass');
    expect(status.sheetSummary.className).toBe('Barbarian');
  });

  test('reports ready when Barbarian choices are complete', () => {
    const status = getBarbarianFinalStatus({
      character: { character_class: 'Barbarian', level: 3, subclass: 'Path of the Berserker' },
      level: 3,
      edition: '2024',
      subclass: 'Path of the Berserker',
      weaponMasteries: ['Cleave', 'Topple'],
    });

    expect(status.ready).toBe(true);
    expect(status.missingSections).toEqual([]);
  });
});
