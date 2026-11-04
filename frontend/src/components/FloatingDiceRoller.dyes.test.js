import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { DICE_DYES } from '@/components/dice3d/diceDyes';
import { loadDiceDyeId } from '@/lib/diceDyePreference';
import FloatingDiceRoller from './FloatingDiceRoller';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(() => new Promise(() => {})) },
}));

jest.mock('sonner', () => {
  const toast = jest.fn();
  toast.error = jest.fn();
  return { __esModule: true, toast };
});

jest.mock('@/components/DiceRollFlicker', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-flicker" />,
}));

jest.mock('@/lib/liveDisplayBus', () => ({
  __esModule: true,
  loadDisplayState: jest.fn(() => null),
  subscribeDisplayState: jest.fn(() => () => {}),
  subscribeRemoteDisplayState: jest.fn(() => () => {}),
}));

function openPanel() {
  const view = render(
    <MemoryRouter initialEntries={['/']}>
      <FloatingDiceRoller />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByTestId('dice-roller-toggle'));
  return view;
}

describe('choosing a dice colour', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('offers every dye', () => {
    openPanel();
    DICE_DYES.forEach((dye) => {
      expect(screen.getByTestId(`dice-dye-${dye.id}`)).toBeInTheDocument();
    });
  });

  test('marks exactly one dye as chosen', () => {
    openPanel();
    const chosen = DICE_DYES.filter(
      (dye) => screen.getByTestId(`dice-dye-${dye.id}`).getAttribute('aria-pressed') === 'true',
    );
    expect(chosen).toHaveLength(1);
    expect(chosen[0].id).toBe('amber');
  });

  test('a swatch shows a number in that dye, not just a blob of colour', () => {
    // The player is picking the thing they will read at the table.
    openPanel();
    const swatch = screen.getByTestId('dice-dye-garnet');
    expect(swatch).toHaveTextContent('20');
    expect(swatch).toHaveAttribute('aria-label', 'Garnet');
  });

  test('choosing a dye saves it and moves the selection', () => {
    openPanel();
    fireEvent.click(screen.getByTestId('dice-dye-moss'));

    expect(loadDiceDyeId()).toBe('moss');
    expect(screen.getByTestId('dice-dye-moss')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dice-dye-amber')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a saved dye is still chosen when the roller is reopened', () => {
    const first = openPanel();
    fireEvent.click(screen.getByTestId('dice-dye-ledger'));
    first.unmount();

    openPanel();
    expect(screen.getByTestId('dice-dye-ledger')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dice-dye-amber')).toHaveAttribute('aria-pressed', 'false');
  });
});
