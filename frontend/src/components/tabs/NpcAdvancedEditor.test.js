import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NpcAdvancedEditor from './NpcAdvancedEditor';

describe('GM detailed NPC edit form', () => {
  const base = {
    name: 'Jordan Crow',
    combat_ready: true,
    cr: '',
    hp: 168,
    stats: { strength: 20, dexterity: 12, constitution: 18, intelligence: 10, wisdom: 14, charisma: 14 },
    actions: [{ name: 'Great Weapon', bonus: '+9', damage: '2d6+5 slashing', recharge: '5-6' }],
    bonus_actions: [{ name: 'Shield-Line Order', description: 'Ally moves 10 feet', uses: '1/turn' }],
    backstory: 'Adopted by halflings.',
  };

  function show(value = base, onChange = jest.fn()) {
    render(<NpcAdvancedEditor value={value} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Full stat block, abilities & backstory/i));
    return onChange;
  }

  test('shows actual ability scores and existing action data', () => {
    show();
    expect(screen.getByLabelText('STR')).toHaveValue(20);
    expect(screen.getByLabelText('DEX')).toHaveValue(12);
    expect(screen.getByLabelText('Bonus actions name 1')).toHaveValue('Shield-Line Order');
    expect(screen.getByLabelText('Actions (attack roll and damage) name 1')).toHaveValue('Great Weapon');
    expect(screen.getByText(/Adopted by halflings/)).toBeInTheDocument();
  });

  test('changing a bonus action preserves its hidden metadata', () => {
    const spy = show();
    fireEvent.change(screen.getByLabelText('Bonus actions description 1'), {
      target: { value: 'Move up to 15 feet' },
    });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      bonus_actions: [{ name: 'Shield-Line Order', description: 'Move up to 15 feet', uses: '1/turn' }],
      actions: base.actions,
    }));
  });

  test('new actions are added only to the relevant category', () => {
    const spy = show({ ...base, reactions: [] });
    fireEvent.click(screen.getByRole('button', { name: /Add reaction/i }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      reactions: [{ name: '', description: '' }],
      actions: base.actions,
    }));
  });
});
