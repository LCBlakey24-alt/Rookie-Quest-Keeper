import { getMonkClassLevel, isMonkCharacter } from './monkCharacterShape';
import { getMonkSheetSummary } from './monkSheetSummary';

describe('monk sheet summary', () => {
  test('detects Monk levels from multiclass shapes', () => {
    expect(isMonkCharacter({ character_class: 'Fighter', classLevels: { Monk: 5 } })).toBe(true);
    expect(getMonkClassLevel({ character_class: 'Rogue', multiclass_levels: { Monk: 3 } })).toBe(3);
    expect(getMonkClassLevel({ classes: [{ name: 'Monk', level: 7 }] })).toBe(7);
  });

  test('summarises discipline, martial arts, and defenses', () => {
    const summary = getMonkSheetSummary({ character_class: 'Monk', level: 7, subclass: 'Way of Shadow', dexterity: 16, wisdom: 14 });
    expect(summary.resourceUses).toBe(7);
    expect(summary.martialArtsDie).toBe('d6');
    expect(summary.unarmoredDefenseAc).toBe(15);
    expect(summary.evasion).toBe(true);
    expect(summary.subclassLabel).toBe('Way of Shadow');
  });
});
