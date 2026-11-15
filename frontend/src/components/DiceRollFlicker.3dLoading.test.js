import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import DiceRollFlicker from './DiceRollFlicker';
import { loadDiceTray3D } from '@/components/dice3d/loadDiceTray3D';

jest.mock('@/components/dice3d/loadDiceTray3D', () => ({
  __esModule: true,
  loadDiceTray3D: jest.fn(),
}));

jest.mock('@/components/FlatDiceResultOverlay', () => ({
  __esModule: true,
  default: () => require('react').createElement('div', { 'data-testid': 'flat-dice-overlay' }),
}));

const props = {
  isOpen: true,
  rollId: 'global-roll-1',
  label: 'Global d20',
  rolls: [{ sides: 20, result: 14 }],
  total: 14,
  theme: 'gm',
  onClose: () => {},
};

describe('shared 3D dice loading', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    loadDiceTray3D.mockReset();
    window.matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  test('does not flash the retired flat result while the physical renderer loads', async () => {
    let finishLoading;
    loadDiceTray3D.mockReturnValue(new Promise((resolve) => { finishLoading = resolve; }));
    const PhysicalTray = () => <div data-testid="physical-dice-tray" />;

    render(<DiceRollFlicker {...props} />);

    expect(screen.getByTestId('dice-3d-preparing')).toHaveTextContent('Preparing 3D dice');
    expect(screen.queryByTestId('flat-dice-overlay')).not.toBeInTheDocument();

    await act(async () => { finishLoading(PhysicalTray); });

    expect(screen.getByTestId('physical-dice-tray')).toBeInTheDocument();
    expect(screen.queryByTestId('dice-3d-preparing')).not.toBeInTheDocument();
  });

  test('keeps an honest flat fallback when the 3D chunk cannot load', async () => {
    loadDiceTray3D.mockRejectedValue(new Error('chunk unavailable'));

    render(<DiceRollFlicker {...props} />);

    await waitFor(() => expect(screen.getByTestId('flat-dice-overlay')).toBeInTheDocument());
    expect(screen.queryByTestId('dice-3d-preparing')).not.toBeInTheDocument();
  });

  test('honours reduced motion without downloading the physical renderer', () => {
    window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    render(<DiceRollFlicker {...props} />);

    expect(screen.getByTestId('flat-dice-overlay')).toBeInTheDocument();
    expect(loadDiceTray3D).not.toHaveBeenCalled();
  });
});
