import { getPaladinClassLevel, isPaladinCharacter } from './paladinCharacterShape';
import { getPaladinSheetSummary } from './paladinSheetSummary';

describe('paladin sheet summary', () => {
  test('detects Paladin levels from multiclass shapes', () => {
    expect(isPaladinCharacter({ character_class: 'Fighter', classLevels: { Paladin: 5 } })).toBe(true);
    expect(getPaladinClassLevel({ character_class: 'Rogue', multiclass_levels: { Paladin: 3 } })).toBe(3);
    expect(getPaladinClassLevel({ classes: [{ name: 'Paladin', level: 7 }] })).toBe(7);
  });
  test('summarises lay on hands, smite, slots, aura, and oath', () => {
    const summary = getPaladinSheetSummary({ character_class: 'Paladin', level: 6, subclass: 'Oath of Devotion' });
    expect(summary.layOnHandsPool).toBe(30);
    expect(summary.divineSmite).toBe(true);
    expect(summary.highestSpellLevel).toBe(2);
    expect(summary.auraOfProtection).toBe(true);
    expect(summary.subclassLabel).toBe('Oath of Devotion');
  });
});
