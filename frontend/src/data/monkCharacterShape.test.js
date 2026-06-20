import {
  getMonkClassLevel,
  getMonkClassLevelMap,
  hasMonkClassLevel,
  isMonkCharacter,
  normaliseMonkClassName,
} from './monkCharacterShape';

describe('Monk character shape helpers', () => {
  test('normalises Monk class names', () => {
    expect(normaliseMonkClassName('Monk')).toBe('monk');
    expect(normaliseMonkClassName(' Way of Shadow Monk ')).toBe('wayofshadowmonk');
  });

  test('detects direct Monk class fields', () => {
    expect(isMonkCharacter({ character_class: 'Monk' })).toBe(true);
    expect(isMonkCharacter({ className: 'Monk' })).toBe(true);
    expect(isMonkCharacter({ class: 'Monk' })).toBe(true);
  });

  test('detects direct Monk level fields', () => {
    expect(getMonkClassLevel({ monk_level: 4 })).toBe(4);
    expect(getMonkClassLevel({ monkLevel: 6 })).toBe(6);
    expect(hasMonkClassLevel({ monkLevel: 1 })).toBe(true);
  });

  test('detects Monk levels from level maps', () => {
    expect(getMonkClassLevelMap({ classLevels: { Monk: 3 } })).toEqual({ Monk: 3 });
    expect(getMonkClassLevel({ classLevels: { Monk: 3 } })).toBe(3);
    expect(getMonkClassLevel({ class_levels: { monk: 5 } })).toBe(5);
    expect(getMonkClassLevel({ multiclass_levels: { Monk: 2 } })).toBe(2);
  });

  test('detects Monk levels from class entry arrays', () => {
    expect(getMonkClassLevel({ classes: [{ name: 'Fighter', level: 2 }, { name: 'Monk', level: 4 }] })).toBe(4);
    expect(getMonkClassLevel({ classes: [{ className: 'Monk', classLevel: 7 }] })).toBe(7);
  });

  test('falls back to character level for direct single-class Monk', () => {
    expect(getMonkClassLevel({ character_class: 'Monk', level: 9 })).toBe(9);
  });

  test('does not detect non-Monk characters', () => {
    expect(isMonkCharacter({ character_class: 'Rogue', level: 9 })).toBe(false);
    expect(getMonkClassLevel({ class_levels: { monk: 0 }, character_class: 'Fighter' })).toBe(0);
  });
});
