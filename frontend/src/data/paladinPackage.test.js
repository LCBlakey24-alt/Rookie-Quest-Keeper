import { getPaladinProgressionSummary, getPaladinBuilderOptions, getPaladinFinalStatus, getPaladinSubclassOptions } from './paladinPackage';

describe('paladin package', () => {
  test('exports progression, builder, subclass, and final status helpers', () => {
    expect(getPaladinProgressionSummary(5).layOnHandsPool).toBe(25);
    expect(getPaladinProgressionSummary(5).highestSpellLevel).toBe(2);
    expect(getPaladinBuilderOptions(3).needsSubclass).toBe(true);
    expect(getPaladinSubclassOptions('2024').some(option => option.key === 'glory')).toBe(true);
    expect(getPaladinFinalStatus({ character: { character_class: 'Paladin', level: 3, subclass: 'Oath of Vengeance' }, level: 3, subclass: 'Oath of Vengeance', fightingStyle: 'Defense' }).ready).toBe(true);
  });
});
