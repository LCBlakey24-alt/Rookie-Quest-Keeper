import { DEMO_CHARACTER_FIXTURES, getDemoCharacterFixture, getDemoCharacters } from './demoCharacterFixtures';
import { deriveCharacterSnapshot } from './deriveCharacterSnapshot';
import { canCharacterCastSpells } from './spellDatabase';

const getSavedSpellCount = (character = {}) => [
  ...(character.cantrips_known || []),
  ...(character.cantrips || []),
  ...(character.spells_known || []),
  ...(character.known_spells || []),
  ...(character.spellbook || []),
  ...(character.spells_prepared || []),
  ...(character.prepared_spells || []),
].length;

const hasSlotData = (character = {}) => (
  Object.keys(character.spell_slots || {}).length > 0 ||
  Object.keys(character.spell_slots_remaining || {}).length > 0
);

const getEquippedSlotCount = (character = {}) => Object.keys(character.equipped || {}).length;

const getResourceKeys = (snapshot = {}) => (snapshot.resources || []).map((resource) => resource.key);

const getSpellcastingTypes = (snapshot = {}) => (snapshot.spellcasting?.blocks || []).map((block) => block.type);

describe('demo character fixtures', () => {
  test('exports a reusable fixture pack without mutating live user data', () => {
    expect(DEMO_CHARACTER_FIXTURES.length).toBeGreaterThanOrEqual(8);
    expect(getDemoCharacters()).toHaveLength(DEMO_CHARACTER_FIXTURES.length);
    expect(getDemoCharacterFixture(DEMO_CHARACTER_FIXTURES[0].slug)).toBe(DEMO_CHARACTER_FIXTURES[0]);
  });

  test.each(DEMO_CHARACTER_FIXTURES)('$slug derives a playable character snapshot', ({ character }) => {
    const snapshot = deriveCharacterSnapshot(character);

    expect(snapshot.identity.name).toBe(character.name);
    expect(snapshot.identity.primaryClass).toBe(character.character_class);
    expect(snapshot.identity.level).toBe(character.level);
    expect(snapshot.features.length).toBeGreaterThan(0);
    expect(snapshot.proficiencyBonus).toBeGreaterThanOrEqual(2);
    expect(snapshot.warnings.some((warning) => warning.includes('not one of the 12 core classes'))).toBe(false);
    expect(snapshot.warnings.some((warning) => warning.includes('No playable class level'))).toBe(false);
  });

  test.each(DEMO_CHARACTER_FIXTURES.filter((fixture) => fixture.expected.caster))('$slug has spellcasting data, saved spells, and slot coverage', ({ character, expected }) => {
    const snapshot = deriveCharacterSnapshot(character);

    expect(canCharacterCastSpells(character)).toBe(true);
    expect(snapshot.spellcasting.blocks.length).toBeGreaterThan(0);
    expect(getSpellcastingTypes(snapshot)).toContain(expected.spellcastingType);
    expect(getSavedSpellCount(character)).toBeGreaterThan(0);
    expect(hasSlotData(character)).toBe(true);
    expected.spellFields.forEach((field) => expect(Array.isArray(character[field])).toBe(true));
  });

  test.each(DEMO_CHARACTER_FIXTURES.filter((fixture) => !fixture.expected.caster))('$slug stays non-caster unless its fixture says otherwise', ({ character }) => {
    expect(canCharacterCastSpells(character)).toBe(false);
    expect(getSavedSpellCount(character)).toBe(0);
  });

  test.each(DEMO_CHARACTER_FIXTURES)('$slug has inventory/equipment data for sheet rendering', ({ character }) => {
    expect(Array.isArray(character.inventory)).toBe(true);
    expect(getEquippedSlotCount(character)).toBeGreaterThan(0);
    expect(character.armor_class).toBeGreaterThan(0);
    expect(character.current_hit_points).toBeGreaterThan(0);
    expect(character.max_hit_points).toBeGreaterThan(0);
  });

  test('monk fixture includes Ki resources through the canonical snapshot', () => {
    const monk = getDemoCharacterFixture('monk-resource-level-6').character;
    const snapshot = deriveCharacterSnapshot(monk);

    expect(getResourceKeys(snapshot)).toContain('ki');
    expect(snapshot.actionEconomy.bonusActions.map((card) => card.title)).toEqual(expect.arrayContaining(['Flurry of Blows', 'Patient Defense', 'Step of the Wind']));
  });
});
