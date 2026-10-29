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

test('HP save states still disable the relevant controls', () => {
  renderStatus({ savingHp: true, savingTempHp: true, tempHp: 0 });
  expect(screen.getByRole('button', { name: /Take 1 hit point of damage/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Heal 1 hit point/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Remove 1 temporary hit point/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Add 1 temporary hit point/ })).toBeDisabled();
});
