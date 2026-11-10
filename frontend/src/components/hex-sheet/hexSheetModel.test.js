import { abilityRows, formatModifier, identityLines, portraitUrlFor, proficiencyBonusFor, vitalsFor } from './hexSheetModel';

const monk = {
  name: 'Punch', level: 5, character_class: 'Monk', subclass: 'way-of-the-open-hand',
  strength: 12, dexterity: 18, constitution: 14, intelligence: 10, wisdom: 16, charisma: 8,
  saving_throw_proficiencies: ['strength', 'dexterity'],
  max_hit_points: 35, current_hit_points: 30, temporary_hit_points: 4,
};

describe('ability checks and saving throws', () => {
  const rows = Object.fromEntries(abilityRows(monk).map((row) => [row.key, row]));

  test('a check is the plain ability modifier', () => {
    expect(rows.strength.check).toBe(1);
    expect(rows.dexterity.check).toBe(4);
    expect(rows.charisma.check).toBe(-1);
  });

  test('a save adds proficiency only where the character is proficient', () => {
    expect(rows.strength.save).toBe(1 + 3);
    expect(rows.dexterity.save).toBe(4 + 3);
    expect(rows.wisdom.save).toBe(3);
    expect(rows.wisdom.saveProficient).toBe(false);
  });

  test.each([['Strength'], ['STR'], ['str'], ['strength']])('save proficiency is recognised when stored as %s', (stored) => {
    const [strength] = abilityRows({ ...monk, saving_throw_proficiencies: [stored] });
    expect(strength.saveProficient).toBe(true);
  });

  test('proficiency comes from the saved bonus, else from level', () => {
    expect(proficiencyBonusFor({ level: 1 })).toBe(2);
    expect(proficiencyBonusFor({ level: 9 })).toBe(4);
    expect(proficiencyBonusFor({ level: 9, proficiency_bonus: 5 })).toBe(5);
  });

  test('missing scores fall back to 10', () => {
    expect(abilityRows({}).every((row) => row.check === 0 && row.save === 0)).toBe(true);
  });
});

test('vitals come from the saved character', () => {
  const vitals = vitalsFor(monk);
  expect(vitals).toMatchObject({ currentHp: 30, maxHp: 35, tempHp: 4 });
  expect(typeof vitals.initiative).toBe('number');
  expect(typeof vitals.armorClass).toBe('number');
});

describe('header lines, as in the sketch', () => {
  test('name, class with level, subclass', () => {
    expect(identityLines(monk)).toEqual({ name: 'Punch', classLine: 'Monk — Level 5', subclassLine: 'Way of the Open Hand' });
  });

  test('a multiclass character shows its whole progression', () => {
    const lines = identityLines({ name: 'Mix', level: 5, character_class: 'Fighter', class_levels: { Fighter: 3, Wizard: 2 } });
    expect(lines.classLine).toContain('/');
    expect(lines.subclassLine).toBe('');
  });
});

test('only real image addresses are used as portraits', () => {
  expect(portraitUrlFor({ portrait_url: 'https://cdn.example/p.png' })).toBe('https://cdn.example/p.png');
  expect(portraitUrlFor({ portrait_url: 'data:image/png;base64,AAAA' })).toMatch(/^data:image/);
  expect(portraitUrlFor({ portrait_url: 'javascript:alert(1)' })).toBe('');
  expect(portraitUrlFor({})).toBe('');
});

test('modifiers are written with a sign', () => {
  expect(formatModifier(3)).toBe('+3');
  expect(formatModifier(0)).toBe('+0');
  expect(formatModifier(-1)).toBe('-1');
});
