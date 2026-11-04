import React from 'react';
import { render, screen } from '@testing-library/react';

import DiceTray3DOverlay from './DiceTray3DOverlay';

// jsdom has no WebGL, so these tests exercise the path that matters most for
// the table: when the tray cannot run, the player still gets their result.
const baseProps = {
  total: 17,
  label: '1d20+5',
  rollDetail: 'd20: 12 + 5',
  formulaText: '12 + 5 = 17',
  isRevealed: true,
  isCrit: false,
  isFumble: false,
  onRevealNow: () => {},
  onClose: () => {},
};

describe('DiceTray3DOverlay falls back rather than hiding a result', () => {
  test('shows the flat result card when WebGL is unavailable', () => {
    render(<DiceTray3DOverlay {...baseProps} rolls={[{ id: 'a', sides: 20, result: 12 }]} />);

    expect(screen.getByTestId('flat-dice-overlay')).toBeInTheDocument();
    expect(screen.queryByTestId('dice-tray-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('flat-dice-total')).toHaveTextContent('17');
  });

  test('falls back for a die it has no solid for', () => {
    // A homebrew d7 is a legal roll. The result must still be shown.
    render(<DiceTray3DOverlay {...baseProps} rolls={[{ id: 'a', sides: 7, result: 3 }]} />);
    expect(screen.getByTestId('flat-dice-overlay')).toBeInTheDocument();
  });

  test('falls back when any die in the pool is unsupported', () => {
    // Not "render the ones we can" -- a pool missing a die misleads.
    render(<DiceTray3DOverlay {...baseProps} rolls={[
      { id: 'a', sides: 20, result: 12 },
      { id: 'b', sides: 7, result: 3 },
    ]} />);
    expect(screen.getByTestId('flat-dice-overlay')).toBeInTheDocument();
  });

  test('falls back for a result the die cannot show', () => {
    render(<DiceTray3DOverlay {...baseProps} rolls={[{ id: 'a', sides: 20, result: 44 }]} />);
    expect(screen.getByTestId('flat-dice-overlay')).toBeInTheDocument();
  });

  test('falls back when there are no dice at all', () => {
    render(<DiceTray3DOverlay {...baseProps} rolls={[]} />);
    expect(screen.getByTestId('flat-dice-overlay')).toBeInTheDocument();
  });
});
