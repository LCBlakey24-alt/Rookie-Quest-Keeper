import React from 'react';
import { act, render, screen } from '@testing-library/react';
import DiceRollFlicker from './DiceRollFlicker';

jest.mock('@/components/FlatDiceResultOverlay', () => ({
  __esModule: true,
  default: ({ total, isRevealed }) => require('react').createElement('div', {
    'data-testid': 'roll-overlay',
    'data-revealed': String(isRevealed),
  }, String(total)),
}));

const rollProps = (overrides = {}) => ({
  isOpen: true,
  rollId: 'roll-a',
  label: 'Dexterity',
  rolls: [{ sides: 20, result: 12 }],
  total: 12,
  modifier: 0,
  theme: 'gm',
  ...overrides,
});

describe('dice overlay lifecycle', () => {
  let originalMatchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    originalMatchMedia = window.matchMedia;
    // Use the flat reduced-motion path so this tests lifecycle timing
    // without requiring WebGL or an asynchronously downloaded chunk.
    window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.useRealTimers();
  });

  test('holds the settled result for six seconds, not three', () => {
    const onClose = jest.fn();
    render(<DiceRollFlicker {...rollProps({ onClose })} />);
    act(() => { jest.advanceTimersByTime(90); });
    expect(screen.getByTestId('roll-overlay')).toHaveAttribute('data-revealed', 'true');

    act(() => { jest.advanceTimersByTime(5900); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(100); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('announces a result exactly once and only when it becomes visible', () => {
    const onReveal = jest.fn();
    const view = render(<DiceRollFlicker {...rollProps({ onReveal })} />);

    expect(onReveal).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(89); });
    expect(onReveal).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledWith(expect.objectContaining({ total: 12 }));

    view.rerender(<DiceRollFlicker {...rollProps({ onReveal })} />);
    act(() => { jest.advanceTimersByTime(200); });
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  test('an unrelated rerender with identical dice does not restart the hold', () => {
    const onClose = jest.fn();
    const view = render(<DiceRollFlicker {...rollProps({ onClose })} />);
    act(() => { jest.advanceTimersByTime(90); });
    act(() => { jest.advanceTimersByTime(3000); });
    view.rerender(<DiceRollFlicker {...rollProps({ onClose })} />);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a new roll identity resets the reveal lifecycle even with the same values', () => {
    const onClose = jest.fn();
    const view = render(<DiceRollFlicker {...rollProps({ onClose })} />);
    act(() => { jest.advanceTimersByTime(90); });
    expect(screen.getByTestId('roll-overlay')).toHaveAttribute('data-revealed', 'true');

    view.rerender(<DiceRollFlicker {...rollProps({ rollId: 'roll-b', onClose })} />);
    expect(screen.getByTestId('roll-overlay')).toHaveAttribute('data-revealed', 'false');
    act(() => { jest.advanceTimersByTime(90); });
    expect(screen.getByTestId('roll-overlay')).toHaveAttribute('data-revealed', 'true');
    act(() => { jest.advanceTimersByTime(5900); });
    expect(onClose).not.toHaveBeenCalled();
  });
});
