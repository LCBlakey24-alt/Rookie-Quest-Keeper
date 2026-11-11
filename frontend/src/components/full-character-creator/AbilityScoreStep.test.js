import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import AbilityScoreStep from './AbilityScoreStep';
import { pointBuyRemaining } from '@/data/abilityScoreMethods';

jest.mock('@/components/DiceRollFlicker', () => function MockFlicker({ label, rolls, total, theme }) {
  return <div data-testid="dice-flicker" data-theme={theme} data-total={total}>{label} {rolls.map((die) => `${die.result}${die.dropped ? 'x' : ''}`).join(',')}</div>;
});

const STANDARD = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };

function Harness({ initial = {} }) {
  const [draft, setDraft] = useState({ scores: STANDARD, abilityMethod: 'standard', rolledScores: [], ...initial });
  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const setScore = (ability, value) => update({ scores: { ...draft.scores, [ability]: Number(value) } });
  return (
    <>
      <AbilityScoreStep draft={draft} update={update} setScore={setScore} finalScores={draft.scores} bonus={{}} />
      <output data-testid="draft">{JSON.stringify(draft)}</output>
    </>
  );
}
const draftNow = () => JSON.parse(screen.getByTestId('draft').textContent);

describe('standard array', () => {
  test('tapping two abilities swaps their scores', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-pick-strength'));
    fireEvent.click(screen.getByTestId('ability-pick-charisma'));
    expect(draftNow().scores.strength).toBe(8);
    expect(draftNow().scores.charisma).toBe(15);
  });
});

describe('point buy', () => {
  test('switching starts every score at 8 with 27 points', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-point'));
    expect(Object.values(draftNow().scores)).toEqual([8, 8, 8, 8, 8, 8]);
    expect(screen.getByRole('slider', { name: 'Strength score' })).toHaveAttribute('aria-valuetext', 'Strength 8, 27 points left');
  });

  test('the dial raises the chosen ability and stops at what the budget allows', () => {
    render(<Harness initial={{ abilityMethod: 'point', scores: { strength: 15, dexterity: 15, constitution: 13, intelligence: 8, wisdom: 8, charisma: 8 } }} />);
    // 9 + 9 + 5 = 23 spent, 4 left.
    fireEvent.click(screen.getByTestId('ability-pick-wisdom'));
    const dial = screen.getByRole('slider', { name: 'Wisdom score' });
    fireEvent.keyDown(dial, { key: 'End' }); // try to go to 15
    expect(draftNow().scores.wisdom).toBe(12); // 4 points buys 12, no further
    expect(pointBuyRemaining(draftNow().scores)).toBe(0);
    expect(screen.getByTestId('ability-knob-status')).toHaveTextContent('Not enough points');
    fireEvent.keyDown(dial, { key: 'ArrowLeft' });
    expect(draftNow().scores.wisdom).toBe(11);
  });

  test('the + and − buttons follow the same rules', () => {
    render(<Harness initial={{ abilityMethod: 'point', scores: { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 } }} />);
    expect(screen.getByRole('button', { name: 'Lower Strength' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Raise Strength' }));
    expect(draftNow().scores.strength).toBe(9);
  });
});

describe('rolling 4d6', () => {
  test('each roll is thrown in the 3D dice window and fills the next ability', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-roll'));
    expect(screen.getByTestId('ability-card-strength')).toHaveClass('is-empty');
    fireEvent.click(screen.getByTestId('ability-roll-next'));
    const flicker = screen.getByTestId('dice-flicker');
    expect(flicker).toHaveTextContent('Strength · 4d6, lowest dropped');
    expect(flicker).toHaveAttribute('data-theme', 'builder'); // never recorded as a campaign roll
    expect(draftNow().rolledScores).toHaveLength(1);
    expect(draftNow().scores.strength).toBe(Number(flicker.getAttribute('data-total')));
    expect(screen.getByTestId('ability-roll-next')).toHaveTextContent('Roll Dexterity');
  });

  test('roll the rest finishes all six, then scores can be swapped', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-roll'));
    act(() => { fireEvent.click(screen.getByTestId('ability-roll-rest')); });
    const { rolledScores, scores } = draftNow();
    expect(rolledScores).toHaveLength(6);
    rolledScores.forEach((roll) => {
      expect(roll.total).toBeGreaterThanOrEqual(3);
      expect(roll.total).toBeLessThanOrEqual(18);
    });
    fireEvent.click(screen.getByTestId('ability-pick-strength'));
    fireEvent.click(screen.getByTestId('ability-pick-wisdom'));
    expect(draftNow().scores.strength).toBe(scores.wisdom);
    expect(draftNow().scores.wisdom).toBe(scores.strength);
  });
});

describe('manual', () => {
  test('keeps typed scores', () => {
    render(<Harness initial={{ abilityMethod: 'manual' }} />);
    fireEvent.change(screen.getByLabelText('Strength score'), { target: { value: '17' } });
    expect(draftNow().scores.strength).toBe(17);
  });
});
