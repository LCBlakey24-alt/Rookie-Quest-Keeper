import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CleanSheetCompactStatus from './CleanSheetCompactStatus';

function renderStatus(overrides = {}) {
  const handlers = {
    onHpAmountChange: jest.fn(),
    onTempHpAmountChange: jest.fn(),
    onDamage: jest.fn(),
    onHeal: jest.fn(),
    onTempHpAdd: jest.fn(),
    onTempHpRemove: jest.fn(),
    onRollInitiative: jest.fn(),
  };
  const props = {
    currentHp: 12,
    maxHp: 24,
    tempHp: 5,
    hpAmount: 1,
    tempHpAmount: 1,
    hasInspiration: false,
    ac: 16,
    speed: 30,
    initiative: 2,
    proficiencyBonus: 3,
    ...handlers,
    ...overrides,
  };
  const view = render(<MemoryRouter><CleanSheetCompactStatus {...props} /></MemoryRouter>);
  return { ...view, handlers, props };
}

test('HP actions have amount-aware names and keep the same callbacks', () => {
  const { rerender, handlers, props } = renderStatus();

  expect(screen.getByRole('button', { name: 'Take 1 hit point of damage' })).toHaveTextContent('- HP');
  expect(screen.getByRole('button', { name: 'Heal 1 hit point' })).toHaveTextContent('+ HP');
  expect(screen.getByRole('button', { name: 'Remove 1 temporary hit point' })).toHaveTextContent('Temp -');
  expect(screen.getByRole('button', { name: 'Add 1 temporary hit point' })).toHaveTextContent('Temp +');
  expect(screen.getByText('12/24')).toHaveAttribute('aria-live', 'polite');

  fireEvent.change(screen.getByRole('combobox', { name: 'HP amount' }), { target: { value: '6' } });
  expect(handlers.onHpAmountChange).toHaveBeenCalledWith(6);
  expect(handlers.onTempHpAmountChange).toHaveBeenCalledWith(6);

  rerender(<MemoryRouter><CleanSheetCompactStatus {...props} hpAmount={6} tempHpAmount={6} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Take 6 hit points of damage' }));
  fireEvent.click(screen.getByRole('button', { name: 'Heal 6 hit points' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove 6 temporary hit points' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add 6 temporary hit points' }));

  expect(handlers.onDamage).toHaveBeenCalledTimes(1);
  expect(handlers.onHeal).toHaveBeenCalledTimes(1);
  expect(handlers.onTempHpRemove).toHaveBeenCalledTimes(1);
  expect(handlers.onTempHpAdd).toHaveBeenCalledTimes(1);
});

test('a save in flight never locks the HP buttons; it only says it is saving', () => {
  // Locking them while a slow save ran silently ate the player's next taps.
  const { handlers } = renderStatus({ savingHp: true, savingTempHp: true, tempHp: 3 });
  for (const name of [/Take 1 hit point of damage/, /Heal 1 hit point/, /Remove 1 temporary hit point/, /Add 1 temporary hit point/]) {
    expect(screen.getByRole('button', { name })).toBeEnabled();
  }
  fireEvent.click(screen.getByRole('button', { name: /Take 1 hit point of damage/ }));
  fireEvent.click(screen.getByRole('button', { name: /Take 1 hit point of damage/ }));
  expect(handlers.onDamage).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('status')).toHaveTextContent('Saving…');
});

test('the saving hint is empty when nothing is saving', () => {
  renderStatus();
  expect(screen.getByTestId('hp-save-status')).toHaveTextContent('');
});

test('temp HP cannot be removed below zero', () => {
  renderStatus({ tempHp: 0 });
  expect(screen.getByRole('button', { name: /Remove 1 temporary hit point/ })).toBeDisabled();
});

test('the existing live HP snapshot supplies the Core Stats heading without changing combat controls', () => {
  const { handlers } = renderStatus();
  const coreHeading = screen.getByRole('heading', { name: 'Core Stats', level: 2 });
  expect(coreHeading).toHaveClass('rqk-cc-core-title');
  expect(screen.getByRole('meter', { name: 'Hit points remaining' })).toHaveAttribute('aria-valuenow', '12');
  fireEvent.click(screen.getByRole('button', { name: 'Take 1 hit point of damage' }));
  expect(handlers.onDamage).toHaveBeenCalledTimes(1);
});
