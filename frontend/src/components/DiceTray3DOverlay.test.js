import React from 'react';
import { render, screen } from '@testing-library/react';

import { specForDie } from '@/components/dice3d/diceTrayScene';
import DiceTray3DOverlay from './DiceTray3DOverlay';

// This project sets jest `resetMocks: true`, so the real implementation is
// reattached per test rather than passed to jest.fn().
jest.mock('@/components/dice3d/diceTrayScene', () => {
  const actual = jest.requireActual('@/components/dice3d/diceTrayScene');
  return {
    __esModule: true,
    ...actual,
    specForDie: jest.fn((...args) => actual.specForDie(...args)),
  };
});

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

describe('a re-render does not restart a throw in mid-air', () => {
  beforeEach(() => {
    const actual = jest.requireActual('@/components/dice3d/diceTrayScene');
    specForDie.mockImplementation((...args) => actual.specForDie(...args));
  });

  const dieList = () => [
    { id: 'a', sides: 20, result: 12 },
    { id: 'b', sides: 20, result: 5, dropped: true },
  ];

  test('an equal but newly built rolls array is treated as the same throw', () => {
    // CleanCharacterSheet builds its rolls inline with .filter().map(), so
    // every re-render of the sheet hands this component a new array of new
    // objects for a throw that has not changed.
    const view = render(<DiceTray3DOverlay {...baseProps} rolls={dieList()} />);
    const afterFirst = specForDie.mock.calls.length;
    expect(afterFirst).toBeGreaterThan(0);

    view.rerender(<DiceTray3DOverlay {...baseProps} rolls={dieList()} />);
    view.rerender(<DiceTray3DOverlay {...baseProps} total={99} rolls={dieList()} />);

    expect(specForDie.mock.calls.length).toBe(afterFirst);
  });

  test('a genuinely different roll is a new throw', () => {
    const view = render(<DiceTray3DOverlay {...baseProps} rolls={dieList()} />);
    const afterFirst = specForDie.mock.calls.length;

    view.rerender(<DiceTray3DOverlay {...baseProps} rolls={[{ id: 'a', sides: 20, result: 19 }]} />);

    expect(specForDie.mock.calls.length).toBeGreaterThan(afterFirst);
  });
});
