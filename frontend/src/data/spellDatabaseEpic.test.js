import { getMulticlassSpellSlots } from './spellDatabase';

describe('epic multiclass spell slots', () => {
  test('keeps level 21+ combined caster on the level 20 slot table', () => {
    const result = getMulticlassSpellSlots({ Wizard: 20, Cleric: 5 });

    expect(result.multiclassLevel).toBe(25);
    expect(result.cappedMulticlassLevel).toBe(20);
    expect(result.slots[9]).toBe(1);
    expect(result.slots[7]).toBe(2);
  });
});
