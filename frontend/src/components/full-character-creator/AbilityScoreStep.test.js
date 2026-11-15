import React, { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import AbilityScoreStep from './AbilityScoreStep';
import { pointBuyRemaining } from '@/data/abilityScoreMethods';
import { playDialTick } from '@/components/hex-sheet/dialSound';

jest.mock('@/components/hex-sheet/dialSound', () => ({ playDialTick: jest.fn() }));

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
    playDialTick.mockClear();
    render(<Harness />);
    expect(playDialTick).not.toHaveBeenCalled();
    turn('charisma', '15');
    expect(draftNow().scores).toMatchObject({ charisma: 15, strength: 8 });
    expect(playDialTick).toHaveBeenCalledTimes(1);
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
  const rollWheel = (slot) => within(screen.getByTestId(`ability-roll-slot-${slot}`));

  test('six roll wheels: tapping a centre throws 4d6 in the 3D window and the total stays in the centre', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-roll'));
    expect(screen.getByTestId('ability-roll-slot-3')).toHaveClass('is-empty');
    fireEvent.click(rollWheel(3).getByRole('button', { name: 'Roll 4d6 for roll 4' }));
    const flicker = screen.getByTestId('dice-flicker');
    expect(flicker).toHaveTextContent('Roll 4 · 4d6, lowest dropped');
    expect(flicker).toHaveAttribute('data-theme', 'builder');
    const total = Number(flicker.getAttribute('data-total'));
    expect(screen.getByTestId('ability-roll-slot-3')).not.toHaveClass('is-empty');
    // Wheel 4's own ability is Intelligence; the roll lands there first.
    expect(screen.getByTestId('ability-roll-slot-3-ability')).toHaveTextContent('Intelligence');
    expect(draftNow().scores.intelligence).toBe(total);
    // The wedges are the six abilities.
    expect(rollWheel(3).getAllByRole('radio').map((radio) => radio.getAttribute('aria-label')))
      .toEqual(['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
  });

  test('turning a roll wheel gives that roll to the chosen ability; the roll that had it swaps', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-roll'));
    act(() => { fireEvent.click(screen.getByTestId('ability-roll-rest')); });
    const before = draftNow().scores;
    // Roll 1 holds Strength; turn it to Wisdom.
    const option = rollWheel(0).getByRole('radio', { name: 'Wisdom' });
    fireEvent.pointerDown(option, { pointerId: 1, button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(option, { pointerId: 1, clientX: 5, clientY: 5 });
    const after = draftNow().scores;
    expect(after.wisdom).toBe(before.strength);
    expect(after.strength).toBe(before.wisdom);
    expect(screen.getByTestId('ability-roll-slot-0-ability')).toHaveTextContent('Wisdom');
    expect(screen.getByTestId('ability-step-hint')).toHaveTextContent('All six rolled');
  });
});

describe('physical dice', () => {
  test("each ability's wheel runs 3 to 18 and is turned to the total rolled at the table", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-physical'));
    const labels = wheelOf('strength').getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'));
    expect(labels[0]).toBe('3');
    expect(labels[labels.length - 1]).toBe('18');
    turn('strength', '17');
    expect(draftNow().scores.strength).toBe(17);
  });
});

describe('manual', () => {
  test('keeps typed scores', () => {
    render(<Harness initial={{ abilityMethod: 'manual' }} />);
    fireEvent.change(screen.getByLabelText('Strength score'), { target: { value: '17' } });
    expect(draftNow().scores.strength).toBe(17);
  });
});

describe('list alternative', () => {
  afterEach(() => window.localStorage.removeItem('rqk.creator.abilityView'));

  test('Show as list keeps the method: standard-array picks still swap', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-view-toggle'));
    expect(screen.getByTestId('ability-list')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Charisma'), { target: { value: '15' } });
    expect(draftNow().scores).toMatchObject({ charisma: 15, strength: 8 });
  });

  test('in the list, point buy refuses scores you cannot afford', () => {
    render(<Harness initial={{ abilityMethod: 'point', scores: { strength: 15, dexterity: 15, constitution: 15, intelligence: 8, wisdom: 8, charisma: 8 } }} />);
    fireEvent.click(screen.getByTestId('ability-view-toggle'));
    const wisdom = screen.getByLabelText('Wisdom');
    expect(within(wisdom).getByRole('option', { name: '9' })).toBeDisabled();
  });

  test('in the list, each unrolled roll has its own Roll button', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('ability-method-roll'));
    fireEvent.click(screen.getByTestId('ability-view-toggle'));
    fireEvent.click(screen.getByTestId('ability-list-roll-roll-3'));
    expect(draftNow().rolledScores[0]).toMatchObject({ slot: 3, ability: 'intelligence' });
  });
});
