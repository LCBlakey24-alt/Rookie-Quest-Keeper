import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import HexConditions from './HexConditions';

function Harness({ initial = [], onSaved = () => {} }) {
  const [conditions, setConditions] = useState(initial);
  return <HexConditions conditions={conditions} onChange={(next, message) => { setConditions(next); onSaved(next, message); }} />;
}

describe('HexConditions', () => {
  test('the button says what the character is suffering from', () => {
    const { rerender } = render(<HexConditions conditions={[]} />);
    expect(screen.getByTestId('hex-conditions-button')).toHaveTextContent('Conditions');
    expect(screen.getByRole('button', { name: /Conditions: none/ })).toBeInTheDocument();
    rerender(<HexConditions conditions={['poisoned', 'prone']} />);
    expect(screen.getByTestId('hex-conditions-button')).toHaveTextContent('Poisoned, Prone');
    expect(screen.getByRole('button', { name: /Conditions: Poisoned, Prone/ })).toBeInTheDocument();
  });

  test('tapping a condition adds it, tapping again removes it, and each change is saved', () => {
    const onSaved = jest.fn();
    render(<Harness onSaved={onSaved} />);
    fireEvent.click(screen.getByTestId('hex-conditions-button'));
    const poisoned = screen.getByTestId('hex-condition-poisoned');
    expect(poisoned).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(poisoned);
    expect(onSaved).toHaveBeenLastCalledWith(['poisoned'], 'Poisoned added');
    expect(screen.getByTestId('hex-condition-poisoned')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('hex-condition-poisoned'));
    expect(onSaved).toHaveBeenLastCalledWith([], 'Poisoned removed');
  });

  test('each condition carries a one-line reminder, and Escape closes the panel', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('hex-conditions-button'));
    expect(screen.getByRole('dialog', { name: 'Conditions' })).toBeInTheDocument();
    expect(screen.getByTestId('hex-condition-grappled')).toHaveTextContent('Speed becomes 0');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Conditions' })).not.toBeInTheDocument();
  });

  test("a GM's own condition is shown and can be removed", () => {
    const onSaved = jest.fn();
    render(<Harness initial={['Cursed']} onSaved={onSaved} />);
    expect(screen.getByTestId('hex-conditions-button')).toHaveTextContent('Cursed');
    fireEvent.click(screen.getByTestId('hex-conditions-button'));
    fireEvent.click(screen.getByTestId('hex-condition-cursed'));
    expect(onSaved).toHaveBeenLastCalledWith([], 'Cursed removed');
  });
});
