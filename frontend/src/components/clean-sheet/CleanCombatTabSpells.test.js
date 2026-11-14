/**
 * Combat's spells come from the same list as the Magic wheel (review finding 4):
 * names are filled in from the built-in spells before their level is decided,
 * and a Wizard's unprepared spellbook is never offered.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CleanCombatTab from './CleanCombatTab';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
const { toast } = require('sonner');

const base = { strength: 10, dexterity: 12, constitution: 12, current_hit_points: 20, max_hit_points: 20, inventory: [], equipment: [] };

function renderCombat(character, section = ['action', 'bonus', 'reaction', 'other']) {
  const save = jest.fn().mockResolvedValue(true);
  render(<CleanCombatTab character={character} proficiencyBonus={2} onRoll={jest.fn()} onCharacterUpdate={save} section={section} />);
  return save;
}
const card = (name) => screen.getAllByRole('button').find((button) => button.querySelector('strong')?.textContent === name);

beforeEach(() => jest.clearAllMocks());

test('A: Bless saved by name only spends a 1st-level slot (and starts concentration)', async () => {
  const cleric = { ...base, character_class: 'Cleric', level: 3, wisdom: 16, spells_prepared: [{ name: 'Bless' }], spell_slots: { 1: 4, 2: 2 }, spell_slots_remaining: { 1: 4, 2: 2 } };
  const save = renderCombat(cleric);
  expect(card('Bless')).toHaveTextContent('Level 1');
  await act(async () => { fireEvent.click(card('Bless')); });
  // Two pools (1st and 2nd) are offered; take the 1st-level slot.
  const pools = screen.queryByLabelText('Choose spell slot pool for Bless');
  if (pools) await act(async () => { fireEvent.click(pools.querySelectorAll('button')[0]); });
  const [updates] = save.mock.calls[0];
  expect(updates.spell_slots_remaining).toEqual(expect.objectContaining({ 1: 3 }));
  expect(updates.concentrating_on).toBe('Bless');
});

test('a spell saved as plain text is filled in the same way', () => {
  renderCombat({ ...base, character_class: 'Cleric', level: 3, wisdom: 16, spells_prepared: ['Bless'], spell_slots: { 1: 4 }, spell_slots_remaining: { 1: 4 } });
  expect(card('Bless')).toHaveTextContent('Level 1');
});

test('B: a Wizard is not offered a spell that is only in the legacy spellbook', () => {
  const wizard = { ...base, character_class: 'Wizard', level: 3, intelligence: 16, spells_prepared: [{ name: 'Magic Missile' }], spells_known: [{ name: 'Magic Missile' }, { name: 'Shield' }], spell_slots: { 1: 4 }, spell_slots_remaining: { 1: 4 } };
  renderCombat(wizard);
  expect(card('Magic Missile')).toBeTruthy();
  expect(card('Shield')).toBeUndefined();
});

test('a prepared reaction spell is listed under reactions', () => {
  const wizard = { ...base, character_class: 'Wizard', level: 3, intelligence: 16, spells_prepared: [{ name: 'Shield' }], spell_slots: { 1: 4 }, spell_slots_remaining: { 1: 4 } };
  renderCombat(wizard, 'reaction');
  expect(card('Shield')).toBeTruthy();
});

test('an unknown custom spell with no level is not cast as a cantrip', async () => {
  const save = renderCombat({ ...base, character_class: 'Wizard', level: 3, intelligence: 16, spells_prepared: [{ name: 'Glimmerbolt' }], spell_slots: { 1: 4 }, spell_slots_remaining: { 1: 4 } });
  const glimmer = card('Glimmerbolt');
  expect(glimmer).toBeDisabled();
  expect(glimmer).toHaveTextContent(/set its level/);
  expect(save).not.toHaveBeenCalled();
});

test('multiclass: the same spell from two classes keeps one card per class', () => {
  const multi = {
    ...base, character_class: 'Cleric', level: 4, wisdom: 14, intelligence: 14,
    class_levels: { Cleric: 2, Wizard: 2 },
    spells_prepared: [{ name: 'Bless', source_class: 'Cleric' }, { name: 'Magic Missile', source_class: 'Wizard' }],
    spell_slots: { 1: 4, 2: 2 }, spell_slots_remaining: { 1: 4, 2: 2 },
  };
  renderCombat(multi);
  expect(card('Bless')).toBeTruthy();
  expect(card('Magic Missile')).toBeTruthy();
  expect(toast.error).not.toHaveBeenCalled();
});
