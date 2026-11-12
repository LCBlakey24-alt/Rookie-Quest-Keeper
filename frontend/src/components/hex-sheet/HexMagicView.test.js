import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import HexMagicView, { casterFor } from './HexMagicView';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

const wizard = {
  id: 'w1', name: 'Test Wizard', character_class: 'Wizard', level: 5, intelligence: 16,
  cantrips_known: [{ name: 'Fire Bolt' }],
  spells_prepared: [{ name: 'Magic Missile' }, { name: 'Fireball', level: 3 }],
  spell_slots: { 1: 4, 2: 3, 3: 2 },
  spell_slots_remaining: { 1: 4, 2: 3, 3: 2 },
};

function renderMagic(character = wizard) {
  const props = { onRollAttack: jest.fn(() => ({ d20: 9 })), onRollDice: jest.fn(), onSave: jest.fn(() => Promise.resolve(true)), onManage: jest.fn() };
  render(<HexMagicView character={character} proficiencyBonus={3} {...props} />);
  return props;
}

test('the wheel starts on the first slot level and lists its spells with damage and a cast hexagon', () => {
  renderMagic();
  expect(screen.getByRole('radio', { name: '1st level' })).toHaveAttribute('aria-checked', 'true');
  const missile = screen.getByTestId('hex-spell-Magic Missile');
  expect(within(missile).getByRole('button', { name: /Damage for Magic Missile: 3d4\+3/ })).toBeInTheDocument();
  expect(within(missile).getByRole('button', { name: 'Cast Magic Missile, using a 1st-level slot' })).toBeInTheDocument();
  expect(screen.queryByTestId('hex-spell-Fireball')).toBeNull();
});

test('turning to 3rd shows Fireball with its save DC; the cast hexagon spends a 3rd-level slot', async () => {
  const { onSave, onRollDice } = renderMagic();
  fireEvent.keyDown(screen.getByRole('radiogroup', { name: /^Spell level/ }), { key: 'ArrowRight' });
  fireEvent.keyDown(screen.getByRole('radiogroup', { name: /^Spell level/ }), { key: 'ArrowRight' });
  const fireball = screen.getByTestId('hex-spell-Fireball');
  expect(within(fireball).getByText('DC 14 DEX')).toBeInTheDocument();
  fireEvent.click(within(fireball).getByRole('button', { name: /Damage for Fireball: 8d6/ }));
  expect(onRollDice).toHaveBeenCalledWith({ label: 'Fireball', notation: '8d6', kind: 'save' });
  await act(async () => { fireEvent.click(within(fireball).getByRole('button', { name: /Cast Fireball/ })); });
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ spell_slots_remaining: expect.objectContaining({ 3: 1 }) }), expect.anything());
});

test('cantrips: a spell attack at the caster bonus; tapping the name opens the details', () => {
  const { onRollAttack } = renderMagic();
  fireEvent.keyDown(screen.getByRole('radiogroup', { name: /^Spell level/ }), { key: 'ArrowLeft' });
  const bolt = screen.getByTestId('hex-spell-Fire Bolt');
  fireEvent.click(within(bolt).getByRole('button', { name: /Spell attack for Fire Bolt, \+6/ }));
  expect(onRollAttack).toHaveBeenCalledWith('Fire Bolt attack', 6);
  fireEvent.click(within(bolt).getByRole('button', { name: /Fire Bolt/, expanded: false }));
  expect(within(bolt).getByText(/Ranged spell attack/)).toBeInTheDocument();
});

test('a character with no spells or slots gets a way to manage spells', () => {
  const { onManage } = renderMagic({ id: 'f1', character_class: 'Fighter', level: 3 });
  fireEvent.click(screen.getByTestId('hex-magic-manage'));
  expect(onManage).toHaveBeenCalled();
});

test('a Warlock with 3rd-level pact slots sees 1st-level spells, scaled to the slot they will use', () => {
  renderMagic({
    id: 'k1', character_class: 'Warlock', level: 5, charisma: 16,
    spells_known: [{ name: 'Hellish Rebuke', level: 1 }],
    pact_slots: 2, pact_slots_remaining: 2, pact_slot_level: 3,
  });
  const rebuke = screen.getByTestId('hex-spell-Hellish Rebuke');
  expect(within(rebuke).getByRole('button', { name: /Cast Hellish Rebuke, using a 3rd-level slot/ })).toBeEnabled();
  expect(within(rebuke).getByRole('button', { name: /Damage for Hellish Rebuke: 4d10/ })).toBeInTheDocument();
});

describe('casterFor', () => {
  it('uses a homebrew caster\'s own spellcasting ability', () => {
    const runesmith = { character_class: 'Runesmith', level: 5, intelligence: 18, spellcasting_ability: 'intelligence' };
    expect(casterFor(runesmith, { name: 'Rune Bolt' }, 3)).toEqual({ attackBonus: 7, saveDc: 15, mod: 4 });
  });

  it('keeps the class ability for a standard caster', () => {
    expect(casterFor(wizard, { name: 'Fireball' }, 3)).toEqual({ attackBonus: 6, saveDc: 14, mod: 3 });
  });
});
