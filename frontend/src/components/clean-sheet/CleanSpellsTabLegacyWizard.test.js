import React from 'react';
import { render, screen, within } from '@testing-library/react';

import CleanSpellsTab from './CleanSpellsTab';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

// An older Wizard save: the spellbook was kept in spells_known.
const legacyWizard = {
  id: 'w1', name: 'Old Wizard', character_class: 'Wizard', level: 3, intelligence: 16,
  spells_known: [{ name: 'Sleep', level: 1 }, { name: 'Shield', level: 1 }],
  spells_prepared: [{ name: 'Shield', level: 1 }],
  spell_slots: { 1: 4, 2: 2 },
  spell_slots_remaining: { 1: 4, 2: 2 },
};

test('an unprepared spell from an older Wizard save is a spellbook entry, not castable', () => {
  render(<CleanSpellsTab character={legacyWizard} onCharacterUpdate={jest.fn()} />);
  const sleepCard = screen.getAllByText('Sleep')
    .map((node) => node.closest('article, li, .clean-sheet-spell-card, div'))
    .find((card) => card && within(card).queryByText(/must be prepared before you can cast it/i));
  expect(sleepCard).toBeTruthy();
  const cast = within(sleepCard).queryByRole('button', { name: /^Cast$/ });
  if (cast) expect(cast).toBeDisabled();
});
