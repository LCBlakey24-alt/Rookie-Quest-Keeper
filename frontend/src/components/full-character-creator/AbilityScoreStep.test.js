import React, { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

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

// The wheel for one ability, and its radios (the ring's options).
const wheelOf = (ability) => within(screen.getByTestId(`ability-card-${ability}`));
const turn = (ability, label) => {
  const option = wheelOf(ability).getByRole('radio', { name: label });
  fireEvent.pointerDown(option, { pointerId: 1, button: 0, clientX: 5, clientY: 5 });
  fireEvent.pointerUp(option, { pointerId: 1, clientX: 5, clientY: 5 });
};

describe('six wheels', () => {
  test('one wheel per ability, each with a ring of choices', () => {
    render(<Harness />);
    ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach((ability) => {
      expect(wheelOf(ability).getByRole('radiogroup')).toBeInTheDocument();
    });
  });
});

describe('standard array', () => {
  test('turning a wheel to a value swaps it with the ability that had it', () => {
    render(<Harness />);
    turn('charisma', '15');
    expect(draftNow().scores).toMatchObject({ charisma: 15, strength: 8 });
  });
});

describe('point buy', () => {
  test('switching starts every score at 8 with 27 points', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-point'));
    expect(Object.values(draftNow().scores)).toEqual([8, 8, 8, 8, 8, 8]);
    expect(screen.getByTestId('ability-step-hint')).toHaveTextContent('27 of 27 points left');
  });

  test('turning a wheel sets the score, and scores you cannot afford are dimmed and refused', () => {
    render(<Harness initial={{ abilityMethod: 'point', scores: { strength: 15, dexterity: 15, constitution: 15, intelligence: 8, wisdom: 8, charisma: 8 } }} />);
    expect(pointBuyRemaining(draftNow().scores)).toBe(0);
    expect(wheelOf('wisdom').getByRole('radio', { name: '9' })).toHaveAttribute('aria-disabled', 'true');
    turn('wisdom', '9');
    expect(draftNow().scores.wisdom).toBe(8);
    turn('strength', '13');
    expect(draftNow().scores.strength).toBe(13);
    turn('wisdom', '12');
    expect(draftNow().scores.wisdom).toBe(12);
  });

  test('the + and − buttons follow the same rules', () => {
    render(<Harness initial={{ abilityMethod: 'point', scores: { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 } }} />);
    expect(screen.getByRole('button', { name: 'Lower Strength' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Raise Strength' }));
    expect(draftNow().scores.strength).toBe(9);
  });
});

describe('rolling 4d6', () => {
  test("each wheel's centre rolls that ability in the 3D dice window, in any order", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-roll'));
    expect(screen.getByTestId('ability-card-wisdom')).toHaveClass('is-empty');
    fireEvent.click(wheelOf('wisdom').getByRole('button', { name: /Roll Wisdom/ }));
    const flicker = screen.getByTestId('dice-flicker');
    expect(flicker).toHaveTextContent('Wisdom · 4d6, lowest dropped');
    expect(flicker).toHaveAttribute('data-theme', 'builder');
    expect(screen.getByTestId('ability-card-wisdom')).not.toHaveClass('is-empty');
    expect(draftNow().rolledScores).toHaveLength(1);
    expect(draftNow().rolledScores[0].ability).toBe('wisdom');
    expect(draftNow().scores.wisdom).toBe(Number(flicker.getAttribute('data-total')));
    // Rolled abilities have no roll button; the others still do.
    expect(wheelOf('wisdom').queryByRole('button', { name: /Roll Wisdom/ })).toBeNull();
    expect(wheelOf('strength').getByRole('button', { name: /Roll Strength/ })).toBeInTheDocument();
  });

  test('rolls cannot be traded until all six are in; then turning swaps two rolls', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-roll'));
    act(() => { fireEvent.click(screen.getByTestId('ability-roll-rest')); });
    const before = draftNow().scores;
    const strengthRoll = String(before.strength);
    const wisdomRoll = String(before.wisdom);
    // Turn Strength to the roll Wisdom holds (by its position in the ring).
    const wisdomIndex = draftNow().rolledScores.findIndex((entry) => entry.ability === 'wisdom');
    const radios = wheelOf('strength').getAllByRole('radio');
    const option = radios[wisdomIndex];
    fireEvent.pointerDown(option, { pointerId: 1, button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(option, { pointerId: 1, clientX: 5, clientY: 5 });
    const after = draftNow().scores;
    expect(String(after.strength)).toBe(wisdomRoll);
    expect(String(after.wisdom)).toBe(strengthRoll);
    expect(screen.getByTestId('ability-step-hint')).toHaveTextContent('All six rolled');
  });
});

describe('manual', () => {
  test('keeps typed scores', () => {
    render(<Harness initial={{ abilityMethod: 'manual' }} />);
    fireEvent.change(screen.getByLabelText('Strength score'), { target: { value: '17' } });
    expect(draftNow().scores.strength).toBe(17);
  });
});
