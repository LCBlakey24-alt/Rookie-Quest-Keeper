import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';

import { DEFAULT_DYE_ID, DICE_DYES } from '@/components/dice3d/diceDyes';
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
  default: ({ onReveal }) => (
    <div data-testid="mock-flicker">
      <button type="button" data-testid="mock-reveal-roll" onClick={onReveal}>Reveal</button>
    </div>
  ),
}));

jest.mock('@/components/dice3d/DiceDyePicker3D', () => ({
  __esModule: true,
  default: ({ selectedId, onSelect }) => {
    const dyes = require('@/components/dice3d/diceDyes').DICE_DYES;
    return (
      <div data-testid="mock-dye-picker-3d">
        {dyes.map((dye) => (
          <button
            key={dye.id}
            type="button"
            data-testid={`dice-dye-${dye.id}`}
            aria-label={dye.name}
            aria-pressed={selectedId === dye.id}
            onClick={() => onSelect(dye.id)}
          >20</button>
        ))}
      </div>
    );
  },
}));

jest.mock('@/lib/liveDisplayBus', () => ({
  __esModule: true,
  loadDisplayState: jest.fn(() => null),
  subscribeDisplayState: jest.fn(() => () => {}),
  subscribeRemoteDisplayState: jest.fn(() => () => {}),
}));

async function openPanel() {
  const view = render(
    <MemoryRouter initialEntries={['/']}>
      <FloatingDiceRoller />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByTestId('dice-roller-toggle'));
  // React.lazy resolves on a separate turn. Await the real picker so the
  // Suspense transition is part of the test's act boundary, even on a busy
  // parallel CI worker.
  await screen.findByTestId('mock-dye-picker-3d', {}, { timeout: 5000 });
  return view;
}

describe('choosing a dice colour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    toast.mockClear();
  });

  test('offers every dye', async () => {
    await openPanel();
    DICE_DYES.forEach((dye) => {
      expect(screen.getByTestId(`dice-dye-${dye.id}`)).toBeInTheDocument();
    });
  });

  test('marks exactly one dye as chosen', async () => {
    await openPanel();
    const chosen = DICE_DYES.filter(
      (dye) => screen.getByTestId(`dice-dye-${dye.id}`).getAttribute('aria-pressed') === 'true',
    );
    expect(chosen).toHaveLength(1);
    expect(chosen[0].id).toBe(DEFAULT_DYE_ID);
  });

  test('a swatch shows a number in that dye, not just a blob of colour', async () => {
    // The player is picking the thing they will read at the table.
    await openPanel();
    const swatch = screen.getByTestId('dice-dye-garnet');
    expect(swatch).toHaveTextContent('20');
    expect(swatch).toHaveAttribute('aria-label', 'Garnet');
  });

  test('choosing a dye saves it and moves the selection', async () => {
    await openPanel();
    fireEvent.click(screen.getByTestId('dice-dye-moss'));

    expect(loadDiceDyeId()).toBe('moss');
    expect(screen.getByTestId('dice-dye-moss')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dice-dye-amber')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a saved dye is still chosen when the roller is reopened', async () => {
    const first = await openPanel();
    fireEvent.click(screen.getByTestId('dice-dye-ledger'));
    first.unmount();

    await openPanel();
    expect(screen.getByTestId('dice-dye-ledger')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dice-dye-amber')).toHaveAttribute('aria-pressed', 'false');
  });

  test('does not publish a result to history or a toast until the dice reveal', async () => {
    await openPanel();
    fireEvent.click(screen.getByTestId('roll-d20-btn'));

    expect(screen.getByTestId('mock-flicker')).toBeInTheDocument();
    expect(screen.queryByTestId('roll-result')).not.toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('mock-reveal-roll'));

    expect(screen.getByTestId('roll-result')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledTimes(1);
  });
});
