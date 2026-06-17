import {
  getDruidClassLevel,
  getDruidClassLevelMap,
  hasDruidClassLevel,
  isDruidCharacter,
  normaliseDruidClassName,
} from './druidCharacterShape';

describe('Druid character shape helpers', () => {
  test('normalises class names', () => {
    expect(normaliseDruidClassName('Druid')).toBe('druid');
    expect(normaliseDruidClassName(' druid ')).toBe('druid');
    expect(normaliseDruidClassName('Druid / Circle')).toBe('druid_circle');
  });

  test('detects direct Druid class fields', () => {
    expect(isDruidCharacter({ character_class: 'Druid', level: 4 })).toBe(true);
    expect(isDruidCharacter({ className: 'Druid', level: 4 })).toBe(true);
    expect(isDruidCharacter({ class: 'Druid', level: 4 })).toBe(true);
    expect(getDruidClassLevel({ character_class: 'Druid', level: 4 })).toBe(4);
  });

  test('detects explicit Druid level fields', () => {
    expect(isDruidCharacter({ druid_level: 6 })).toBe(true);
    expect(isDruidCharacter({ druidLevel: 7 })).toBe(true);
    expect(getDruidClassLevel({ druid_level: 6 })).toBe(6);
    expect(getDruidClassLevel({ druidLevel: 7 })).toBe(7);
  });

  test('detects class level maps', () => {
    const character = { class_levels: { Fighter: 2, druid: 5 } };

    expect(getDruidClassLevelMap(character)).toEqual({ Fighter: 2, druid: 5 });
    expect(isDruidCharacter(character)).toBe(true);
    expect(getDruidClassLevel(character)).toBe(5);
    expect(hasDruidClassLevel(character)).toBe(true);
  });

  test('detects multiclass maps with varied casing', () => {
    const character = { multiclassLevels: { 'Druid ': 3, Rogue: 2 } };

    expect(isDruidCharacter(character)).toBe(true);
    expect(getDruidClassLevel(character)).toBe(3);
  });

  test('detects class entry arrays', () => {
    const character = {
      classes: [
        { name: 'Fighter', level: 3 },
        { class_name: 'Druid', class_level: 4 },
      ],
    };

    expect(isDruidCharacter(character)).toBe(true);
    expect(getDruidClassLevel(character)).toBe(4);
  });

  test('falls back to total level for direct Druid characters', () => {
    expect(getDruidClassLevel({ character_class: 'Druid', level: 9 })).toBe(9);
    expect(getDruidClassLevel({ character_class: 'Druid' })).toBe(1);
  });

  test('returns false and zero for non-Druid characters', () => {
    expect(isDruidCharacter({ character_class: 'Wizard', level: 8 })).toBe(false);
    expect(getDruidClassLevel({ character_class: 'Wizard', level: 8 })).toBe(0);
    expect(hasDruidClassLevel({ character_class: 'Wizard', level: 8 })).toBe(false);
  });
});
