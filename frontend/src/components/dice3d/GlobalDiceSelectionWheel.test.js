import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import GlobalDiceSelectionWheel from './GlobalDiceSelectionWheel';

function Harness() {
  const [sides, setSides] = React.useState(20);
  const [mode, setMode] = React.useState('normal');
  return (
    <GlobalDiceSelectionWheel
      selectedSides={sides}
      onSidesChange={(nextSides) => {
        setSides(nextSides);
        if (nextSides !== 20) setMode('normal');
      }}
      rollMode={mode}
      onRollModeChange={setMode}
      onRoll={() => {}}
      dyeId="amber"
    />
  );
}

describe('global dice selection wheel', () => {
  test('starts with d20 at the active top position', () => {
    render(<Harness />);
    expect(screen.getByTestId('select-d20-btn')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('roll-d20-btn')).toHaveAccessibleName('Roll d20');
  });

  test('turns to another die without rolling it immediately', () => {
    const onRoll = jest.fn();
    render(
      <GlobalDiceSelectionWheel
        selectedSides={20}
        onSidesChange={() => {}}
        rollMode="normal"
        onRollModeChange={() => {}}
        onRoll={onRoll}
        dyeId="amber"
      />,
    );
    fireEvent.click(screen.getByTestId('select-d8-btn'));
    expect(onRoll).not.toHaveBeenCalled();
  });

  test('disables d20-only modes for other dice', () => {
    render(
      <GlobalDiceSelectionWheel
        selectedSides={8}
        onSidesChange={() => {}}
        rollMode="normal"
        onRollModeChange={() => {}}
        onRoll={() => {}}
        dyeId="amber"
      />,
    );
    expect(screen.getByTestId('roll-advantage-btn')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('roll-disadvantage-btn')).toHaveAttribute('aria-disabled', 'true');
  });

  test('keeps all seven dice on one rotating outer ring with a separate inner mode ring', () => {
    render(<Harness />);
    expect(screen.getByTestId('global-dice-wheel').querySelectorAll('[data-wheel-index]')).toHaveLength(7);
    expect(screen.getByTestId('global-dice-wheel').querySelectorAll('.guild-wheel__inner-mode')).toHaveLength(3);
    fireEvent.click(screen.getByTestId('roll-advantage-btn'));
    expect(screen.getByTestId('roll-advantage-btn')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('roll-d20-btn')).toHaveAccessibleName('Roll d20 with advantage');
  });

  test('non-d20 cannot enable advantage; the centre remains the only roll confirmation', () => {
    const onRoll = jest.fn();
    const handleChange = jest.fn();
    render(<GlobalDiceSelectionWheel
      selectedSides={6} onSidesChange={() => {}}
      rollMode="normal" onRollModeChange={handleChange}
      onRoll={onRoll} dyeId="glow"
    />);
    fireEvent.click(screen.getByTestId('roll-advantage-btn'));
    expect(handleChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('roll-d6-btn'));
    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  test('offers explicit previous and next controls for keyboard users', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Next die' }));
    expect(screen.getByTestId('select-d100-btn')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('roll-d100-btn')).toHaveAccessibleName('Roll d100');
    fireEvent.click(screen.getByRole('button', { name: 'Previous die' }));
    expect(screen.getByTestId('select-d20-btn')).toHaveAttribute('aria-pressed', 'true');
  });
});
