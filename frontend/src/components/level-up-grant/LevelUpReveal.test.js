import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import LevelUpReveal, { levelUpDie } from './LevelUpReveal';

jest.mock('@/components/DiceRollFlicker', () => function MockFlicker({ rolls, label, onClose }) {
  return (
    <div data-testid="level-up-roll">
      {label}: {rolls.map((die) => `d${die.sides}=${die.result}`).join(',')}
      <button type="button" onClick={onClose}>settle</button>
    </div>
  );
});

test('the level-up die is one d20 that lands on the new level', () => {
  expect(levelUpDie(5)).toEqual([{ sides: 20, result: 5, sign: 1 }]);
  expect(levelUpDie(25)[0].result).toBe(20);
});

test('the d20 rolls first, then congratulations names the level, then the choices open', () => {
  const onContinue = jest.fn();
  render(<LevelUpReveal characterName="Pip" fromLevel={4} toLevel={5} onContinue={onContinue} onLater={jest.fn()} />);
  expect(screen.getByTestId('level-up-roll')).toHaveTextContent('Level 5: d20=5');
  act(() => { fireEvent.click(screen.getByText('settle')); });
  expect(screen.getByRole('heading', { name: 'Congratulations!' })).toBeInTheDocument();
  expect(screen.getByText(/has levelled up to level 5/)).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('level-up-now'));
  expect(onContinue).toHaveBeenCalled();
});
