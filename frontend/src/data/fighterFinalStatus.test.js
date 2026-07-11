import { getFighterFinalStatus } from './fighterFinalStatus';

describe('Fighter final status', () => {
  test('combines missing builder choices with sheet summary', () => {
    const status = getFighterFinalStatus({
      character: { character_class: 'Fighter', level: 1 },
      level: 1,
      edition: '2014',
    });

    expect(status.ready).toBe(false);
    expect(status.missingSections).toEqual(['Fighting Style']);
    expect(status.sheetSummary.className).toBe('Fighter');
  });

  test('reports ready when required choices are complete', () => {
    const status = getFighterFinalStatus({
      character: { character_class: 'Fighter', level: 1 },
      level: 1,
      edition: '2014',
      fightingStyle: 'Archery',
    });

    expect(status.ready).toBe(true);
    expect(status.missingSections).toEqual([]);
  });


  test('allows public-safe custom subclass records to complete level 3 readiness', () => {
    const status = getFighterFinalStatus({
      character: { character_class: 'Fighter', level: 3, subclass: 'Custom Fighter Subclass' },
      level: 3,
      edition: '2014',
      fightingStyle: 'Archery',
      subclass: 'Custom Fighter Subclass',
    });

    expect(status.ready).toBe(true);
    expect(status.sheetSummary.isUnsupportedSubclass).toBe(true);
  });

  test('passes through 2024 mastery readiness', () => {
    const status = getFighterFinalStatus({
      character: { character_class: 'Fighter', level: 1 },
      level: 1,
      edition: '2024',
      fightingStyle: 'Blind Fighting',
      weaponMasteries: ['Cleave', 'Topple', 'Vex'],
    });

    expect(status.ready).toBe(true);
    expect(status.choiceSummary.sections.find(section => section.key === 'weapon_mastery').count).toBe(3);
  });
});
