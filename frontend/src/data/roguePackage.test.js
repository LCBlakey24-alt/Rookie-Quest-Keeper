import { getRogueProgressionSummary, getRogueBuilderOptions, getRogueFinalStatus, getRogueSubclassOptions } from './roguePackage';

describe('rogue package', () => {
  test('exports progression, builder, subclass, and final status helpers', () => {
    expect(getRogueProgressionSummary(5).sneakAttackDice).toBe(3);
    expect(getRogueBuilderOptions(3).needsSubclass).toBe(true);
    expect(getRogueSubclassOptions('2024').some(option => option.key === 'soulknife')).toBe(true);
    expect(getRogueFinalStatus({ character: { character_class: 'Rogue', level: 3, subclass: 'Assassin' }, level: 3, subclass: 'Assassin' }).ready).toBe(true);
  });
});
