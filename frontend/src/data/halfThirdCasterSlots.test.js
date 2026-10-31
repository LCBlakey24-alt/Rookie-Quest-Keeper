/**
 * Regression tests: a half/third caster's OWN slot table is the full-caster
 * table at ceil(level / N), not floor.
 *
 * floor() is the *multiclass contribution* rule ("add half your levels in
 * paladin and ranger classes, rounded down"). Using it for a class's own table
 * understated slots at every odd class level, e.g. a 2014 Paladin 5 reported
 * {1:3} instead of {1:4, 2:2}. Even levels coincide, which is why it hid.
 *
 * Every expectation below is checked against SPELL_SLOT_PROGRESSION.half /
 * .third in editionRules.js, which already held the correct RAW tables, so
 * these tests assert agreement between the two sources rather than
 * hand-written numbers.
 */
import { SPELLCASTING_CLASSES, getSpellSlotsForCaster, getMaxSpellLevel, ownCasterTableLevel } from './spellDatabase';
import { SPELL_SLOT_PROGRESSION } from './editionRules';
import { getEditionSpellSlotsForClass, halfCasterContribution } from './editionSpellSlotRules';

// Turn an editionRules row ([4,2,0,...]) into the {level: count} shape the
// spellDatabase helpers return, so the two can be compared directly.
const rowToSlots = (row = []) => {
  const slots = {};
  row.forEach((count, index) => {
    if (count > 0) slots[index + 1] = count;
  });
  return slots;
};

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

describe('half caster own slot table (Paladin / Ranger, 2014)', () => {
  const paladin = SPELLCASTING_CLASSES.Paladin;

  test.each(LEVELS)('level %i matches SPELL_SLOT_PROGRESSION.half', (level) => {
    const expected = rowToSlots(SPELL_SLOT_PROGRESSION.half[level]);
    expect(getSpellSlotsForCaster(paladin, level)).toEqual(expected);
  });

  test('the specific regression: Paladin 5 has 4 first and 2 second level slots', () => {
    expect(getSpellSlotsForCaster(paladin, 5)).toEqual({ 1: 4, 2: 2 });
  });

  test('level 1 still has no slots in 2014 (ceil must not leak a slot)', () => {
    expect(getSpellSlotsForCaster(paladin, 1)).toEqual({});
    expect(ownCasterTableLevel(paladin, 1)).toBe(0);
  });

  test('odd levels are no longer understated', () => {
    // These are the levels the floor bug got wrong.
    [3, 5, 7, 9, 11, 13, 15, 17, 19].forEach((level) => {
      expect(getSpellSlotsForCaster(paladin, level))
        .toEqual(rowToSlots(SPELL_SLOT_PROGRESSION.half[level]));
    });
  });

  test('max spell level tracks the corrected table', () => {
    // getMaxSpellLevel takes (className, characterLevel).
    expect(getMaxSpellLevel('Paladin', 5)).toBe(2);
    expect(getMaxSpellLevel('Paladin', 9)).toBe(3);
    // Previously reported 1 at level 5, because floor(5/2) = 2 -> {1:3}.
    expect(getMaxSpellLevel('Paladin', 3)).toBe(1);
  });
});

describe('third caster own slot table (Eldritch Knight / Arcane Trickster)', () => {
  const fighter = SPELLCASTING_CLASSES.Fighter;

  test.each(LEVELS)('level %i matches SPELL_SLOT_PROGRESSION.third', (level) => {
    const expected = rowToSlots(SPELL_SLOT_PROGRESSION.third[level]);
    expect(getSpellSlotsForCaster(fighter, level)).toEqual(expected);
  });

  test('no slots before level 3', () => {
    expect(getSpellSlotsForCaster(fighter, 1)).toEqual({});
    expect(getSpellSlotsForCaster(fighter, 2)).toEqual({});
  });

  test('the specific regression: Eldritch Knight 7 reaches 2nd level slots', () => {
    expect(getSpellSlotsForCaster(fighter, 7)).toEqual({ 1: 4, 2: 2 });
  });
});

describe('full casters and pact magic are unaffected', () => {
  test('full caster still indexes its own level', () => {
    expect(ownCasterTableLevel(SPELLCASTING_CLASSES.Wizard, 5)).toBe(5);
    expect(getSpellSlotsForCaster(SPELLCASTING_CLASSES.Wizard, 5)).toEqual({ 1: 4, 2: 3, 3: 2 });
  });

  test('warlock keeps its separate pact table', () => {
    const slots = getSpellSlotsForCaster(SPELLCASTING_CLASSES.Warlock, 5);
    expect(slots).toBeTruthy();
    expect(slots).not.toEqual({ 1: 4, 2: 3, 3: 2 });
  });
});

describe('edition-aware path agrees, and the multiclass rule is left intact', () => {
  const paladin2014 = { character_class: 'Paladin', edition: '2014', level: 5 };
  const paladin2024 = { character_class: 'Paladin', edition: '2024', level: 5 };

  test('2014 Paladin 5 is corrected on the edition path too', () => {
    expect(getEditionSpellSlotsForClass(paladin2014, 'Paladin', 5)).toEqual({ 1: 4, 2: 2 });
  });

  test('2024 Paladin 5 is unchanged (it was already right)', () => {
    expect(getEditionSpellSlotsForClass(paladin2024, 'Paladin', 5)).toEqual({ 1: 4, 2: 2 });
  });

  test('2024 Paladin 1 has slots, 2014 Paladin 1 does not', () => {
    expect(getEditionSpellSlotsForClass(paladin2024, 'Paladin', 1)).toEqual({ 1: 2 });
    expect(getEditionSpellSlotsForClass(paladin2014, 'Paladin', 1)).toEqual({});
  });

  test('halfCasterContribution keeps the multiclass semantics it is for', () => {
    // Must stay floor for 2014 and ceil for 2024 -- that 2024 round-up is a
    // genuine rules change, not a bug, and getEditionMulticlassSpellSlots
    // depends on it.
    expect(halfCasterContribution(5, '2014')).toBe(2);
    expect(halfCasterContribution(5, '2024')).toBe(3);
  });
});
