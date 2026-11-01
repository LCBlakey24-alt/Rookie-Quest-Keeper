/**
 * In the 2024 rules, Paladins and Rangers gain Spellcasting at level 1 and
 * start with two 1st-level slots. In 2014 they gain it at level 2 and have no
 * slots at level 1. The two slot tables are otherwise identical.
 *
 * The backend already models this (data/spell_slot_rules.py:
 * class_has_spellcasting returns level >= 1 for a 2024 half caster, and
 * class_spell_slots then returns {"1": 2}). These assertions hold the
 * frontend to the same answer.
 */
import { SPELLCASTING_CLASSES, getSpellSlotsForCaster, ownCasterTableLevel } from './spellDatabase';
import { getPaladinSpellSlots, getPaladinHighestSpellLevel, getPaladinProgressionSummary } from './paladinProgression';
import { buildCharacterCreationPayloadFromTemplate } from './characterCreationPayload';

const paladin = SPELLCASTING_CLASSES.Paladin;
const ranger = SPELLCASTING_CLASSES.Ranger;

describe('2024 half casters gain spellcasting at level 1', () => {
  test('a 2024 half caster has two 1st-level slots at level 1', () => {
    expect(getSpellSlotsForCaster(paladin, 1, '2024')).toEqual({ 1: 2 });
    expect(getSpellSlotsForCaster(ranger, 1, '2024')).toEqual({ 1: 2 });
  });

  test('a 2014 half caster still has no slots at level 1', () => {
    expect(getSpellSlotsForCaster(paladin, 1, '2014')).toEqual({});
    expect(getSpellSlotsForCaster(ranger, 1, '2014')).toEqual({});
  });

  test('the edition defaults to 2014, so existing callers are unchanged', () => {
    expect(getSpellSlotsForCaster(paladin, 1)).toEqual({});
    expect(getSpellSlotsForCaster(paladin, 5)).toEqual({ 1: 4, 2: 2 });
  });

  test('levels 2 to 20 are identical in both editions', () => {
    for (let level = 2; level <= 20; level += 1) {
      expect(getSpellSlotsForCaster(paladin, level, '2024')).toEqual(
        getSpellSlotsForCaster(paladin, level, '2014'),
      );
    }
  });

  test('ownCasterTableLevel starts a 2024 half caster on row 1', () => {
    expect(ownCasterTableLevel(paladin, 1, '2024')).toBe(1);
    expect(ownCasterTableLevel(paladin, 1, '2014')).toBe(0);
    expect(ownCasterTableLevel(paladin, 2, '2024')).toBe(1);
    expect(ownCasterTableLevel(paladin, 5, '2024')).toBe(3);
  });

  test('third casters are untouched by the half-caster change', () => {
    const eldritchKnight = SPELLCASTING_CLASSES['Eldritch Knight'] || SPELLCASTING_CLASSES.Fighter;
    if (!eldritchKnight) return;
    expect(ownCasterTableLevel(eldritchKnight, 2, '2024')).toBe(0);
    expect(ownCasterTableLevel(eldritchKnight, 3, '2024')).toBe(1);
  });
});

describe('paladin progression reports 2024 level-1 slots', () => {
  test('getPaladinSpellSlots is edition aware', () => {
    expect(getPaladinSpellSlots(1, '2024')[0]).toBe(2);
    expect(getPaladinSpellSlots(1, '2014')[0]).toBe(0);
    expect(getPaladinSpellSlots(1)[0]).toBe(0);
  });

  test('getPaladinHighestSpellLevel is edition aware', () => {
    expect(getPaladinHighestSpellLevel(1, '2024')).toBe(1);
    expect(getPaladinHighestSpellLevel(1, '2014')).toBe(0);
  });

  test('a 2024 paladin 1 is not told they have Spellcasting with no slots', () => {
    const summary = getPaladinProgressionSummary(1, '2024', 2);
    const hasSpellcastingFeature = summary.activeFeatures.some((f) => f.type === 'spellcasting');
    expect(hasSpellcastingFeature).toBe(true);
    expect(summary.highestSpellLevel).toBe(1);
    expect(summary.spellSlots[0]).toBe(2);
  });

  test('a 2014 paladin 1 has neither the feature nor slots', () => {
    const summary = getPaladinProgressionSummary(1, '2014', 2);
    expect(summary.activeFeatures.some((f) => f.type === 'spellcasting')).toBe(false);
    expect(summary.highestSpellLevel).toBe(0);
  });
});

describe('character creation writes the right slots for the chosen edition', () => {
  const template = { character_class: 'Paladin', race: 'Human', background: 'Acolyte', level: 1, ability_scores: { strength: 15, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 10, charisma: 14 } };

  test('a new 2024 paladin is saved with its level-1 slots', () => {
    const payload = buildCharacterCreationPayloadFromTemplate(template, { name: 'Javen', edition: '2024' });
    expect(payload.spell_slots).toEqual({ 1: 2 });
  });

  test('a new 2014 paladin is saved with no slots', () => {
    const payload = buildCharacterCreationPayloadFromTemplate(template, { name: 'Javen', edition: '2014' });
    expect(payload.spell_slots || {}).toEqual({});
  });
});
