import React from 'react';
import { act, render, screen } from '@testing-library/react';
import AnimatedLedgerNumber, { ledgerNumberFrame } from './AnimatedLedgerNumber';

let originalMatchMedia;

beforeEach(() => {
  jest.useFakeTimers();
  originalMatchMedia = window.matchMedia;
  window.matchMedia = jest.fn(() => ({ matches: false }));
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  window.matchMedia = originalMatchMedia;
});

describe('Guild Ledger number animation', () => {
  test('cycles glyphs briefly, but always ends on the real count', () => {
    expect(ledgerNumberFrame(27, 0)).not.toBe('27');
    expect(ledgerNumberFrame(27, 9)).toBe('27');
    const { container } = render(<AnimatedLedgerNumber value={27} />);
    const wrapper = screen.getByTestId('animated-ledger-number');
    expect(wrapper).toHaveAttribute('data-count', '27');
    expect(wrapper).toHaveAttribute('data-rolling', 'true');
    // Only the screen-reader copy exposes the actual count during the effect.
    expect(container.querySelector('.rqk-ledger-number__sr-only')).toHaveTextContent('27');
    act(() => jest.advanceTimersByTime(9 * 72));
    expect(wrapper).toHaveAttribute('data-rolling', 'false');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('27');
  });

  test('does not animate a missing count or invent zero during loading', () => {
    const { rerender } = render(<AnimatedLedgerNumber value="—" />);
    expect(screen.getByTestId('animated-ledger-number')).toHaveAttribute('data-rolling', 'false');
    expect(screen.getByTestId('animated-ledger-number')).toHaveAttribute('data-count', '—');
    rerender(<AnimatedLedgerNumber value={0} />);
    expect(screen.getByTestId('animated-ledger-number')).toHaveAttribute('data-count', '0');
    expect(screen.getByTestId('animated-ledger-number')).toHaveAttribute('data-rolling', 'false');
  });

  test('refreshing a count cancels the previous animation and settles on the new value', () => {
    const { rerender, container } = render(<AnimatedLedgerNumber value={18} />);
    act(() => jest.advanceTimersByTime(144));
    rerender(<AnimatedLedgerNumber value={32} />);
    act(() => jest.advanceTimersByTime(900));
    expect(screen.getByTestId('animated-ledger-number')).toHaveAttribute('data-count', '32');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('32');
  });

  test('reduced-motion preference bypasses all changing digits', () => {
    window.matchMedia = jest.fn(() => ({ matches: true }));
    const { container } = render(<AnimatedLedgerNumber value={84} />);
    expect(screen.getByTestId('animated-ledger-number')).toHaveAttribute('data-rolling', 'false');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('84');
  });

  test('non-numeric system and role status text remains unchanged', () => {
    render(<AnimatedLedgerNumber value="Checking" />);
    expect(screen.getByTestId('animated-ledger-number')).toHaveAttribute('data-count', 'Checking');
    expect(screen.getByTestId('animated-ledger-number')).toHaveAttribute('data-rolling', 'false');
  });
});
