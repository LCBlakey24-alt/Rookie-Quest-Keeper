/**
 * Review finding 11: a 2024 Warlock with one level of a half-caster keeps
 * Pact Magic and ordinary slots apart on a Short Rest. Paladins and Rangers
 * cast from level 1 in 2024, so their slots are not the Pact pool.
 */
import { buildShortRestUpdates } from './characterRestRules';

const pactSpent = { pact_magic: { current: 0, remaining: 0, max: 2, slot_level: 1, restore: 'short-rest' } };

test.each([['Paladin'], ['Ranger']])('2024 Warlock 2 / %s 1: Short Rest restores Pact Magic but not ordinary slots', (halfCaster) => {
  const character = {
    character_class: 'Warlock', level: 3, rules_edition: '2024',
    classes: [{ name: 'Warlock', level: 2 }, { name: halfCaster, level: 1 }],
    class_levels: { Warlock: 2, [halfCaster]: 1 },
    spell_slots: { 1: 2 }, spell_slots_remaining: { 1: 0 }, used_spell_slots: { 1: 2 },
    resources: pactSpent,
  };
  const updates = buildShortRestUpdates(character);
  expect(updates.resources.pact_magic.current).toBe(2);
  expect(updates.spell_slots_remaining).toBeUndefined();
  expect(updates.used_spell_slots).toBeUndefined();
});

test('a pure 2024 Warlock still refills its Pact slots on a Short Rest', () => {
  const character = {
    character_class: 'Warlock', level: 2, rules_edition: '2024',
    classes: [{ name: 'Warlock', level: 2 }], class_levels: { Warlock: 2 },
    spell_slots: { 1: 2 }, spell_slots_remaining: { 1: 0 }, resources: pactSpent,
  };
  const updates = buildShortRestUpdates(character);
  expect(updates.resources.pact_magic.current).toBe(2);
  expect(updates.spell_slots_remaining).toEqual({ 1: 2 });
});
