import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { DICE_DYES } from '@/components/dice3d/diceDyes';
import FloatingDiceRoller from './FloatingDiceRoller';

let mockMountSerial = 0;

jest.mock('@/components/DiceRollFlicker', () => ({
  __esModule: true,
  default: ({ rollId, dyeId }) => {
    const React = require('react');
    const [mount] = React.useState(() => ++mockMountSerial);
    return React.createElement('div', {
      'data-testid': 'roll-presentation',
      'data-roll-id': rollId,
      'data-dye-id': dyeId,
      'data-mount': mount,
    });
  },
}));

// Force identical numerical results: two identical 12s must still be two
// independent physical throws, and neither may be re-rolled by the renderer.
jest.mock('@/data/diceRoller', () => ({
  __esModule: true,
  rollDiceNotation: () => ({
    valid: true,
    rolls: [{ sides: 20, result: 12 }],
    total: 12,
    modifier: 0,
  }),
  parseDiceNotation: () => ({ valid: false, terms: [] }),
  getAnimationTarget: () => 12,
}));
jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: () => new Promise(() => {}) },
}));
jest.mock('sonner', () => {
  const toast = () => {};
  toast.error = () => {};
  return { __esModule: true, toast };
});
jest.mock('@/lib/liveDisplayBus', () => ({
  __esModule: true,
  loadDisplayState: () => null,
  subscribeDisplayState: () => () => {},
  subscribeRemoteDisplayState: () => () => {},
}));

function openRoller() {
  render(<MemoryRouter initialEntries={['/']}><FloatingDiceRoller /></MemoryRouter>);
  fireEvent.click(screen.getByTestId('dice-roller-toggle'));
}

describe('fresh physical dice presentation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMountSerial = 0;
  });

  test('replays the visual component even when successive results match', () => {
    openRoller();
    fireEvent.click(screen.getByTestId('roll-d20-btn'));
    const first = screen.getByTestId('roll-presentation');
    const firstRollId = first.getAttribute('data-roll-id');
    const firstMount = first.getAttribute('data-mount');

    fireEvent.click(screen.getByTestId('roll-d20-btn'));
    const second = screen.getByTestId('roll-presentation');
    expect(second.getAttribute('data-roll-id')).not.toBe(firstRollId);
    expect(second.getAttribute('data-mount')).not.toBe(firstMount);
    expect(screen.getAllByTestId('roll-result')).toHaveLength(2);
  });

  test('captures the chosen dye for each roll, not the picker default', () => {
    openRoller();
    const moss = DICE_DYES.find(dye => dye.id === 'moss');
    const swatch = screen.getByTestId('dice-dye-moss');
    expect(swatch).toHaveAttribute('data-rq-colour-swatch', 'true');
    expect(swatch.style.getPropertyValue('--swatch-body')).toBe(moss.body);

    fireEvent.click(swatch);
    fireEvent.click(screen.getByTestId('roll-d20-btn'));
    expect(screen.getByTestId('roll-presentation')).toHaveAttribute('data-dye-id', 'moss');

    fireEvent.click(screen.getByTestId('dice-dye-amber'));
    // The last throw's palette is a snapshot and must not change mid-flight.
    expect(screen.getByTestId('roll-presentation')).toHaveAttribute('data-dye-id', 'moss');
    fireEvent.click(screen.getByTestId('roll-d20-btn'));
    expect(screen.getByTestId('roll-presentation')).toHaveAttribute('data-dye-id', 'amber');
  });
});
