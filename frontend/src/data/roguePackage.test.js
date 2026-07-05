import { getRogueProgressionSummary, getRogueBuilderOptions, getRogueFinalStatus, getRogueSubclassOptions } from './roguePackage';

describe('rogue package', () => {
  test('exports progression, builder, subclass, and final status helpers', () => {
    expect(getRogueProgressionSummary(5).sneakAttackDice).toBe(3);
    expect(getRogueBuilderOptions(3).needsSubclass).toBe(true);
    expect(getRogueSubclassOptions('2024').map(option => option.key)).toEqual(['thief', 'custom_rogue_subclass']);
    expect(getRogueFinalStatus({ character: { character_class: 'Rogue', level: 3, subclass: 'Custom Rogue Subclass' }, level: 3, subclass: 'Custom Rogue Subclass' }).ready).toBe(true);
  });
});
