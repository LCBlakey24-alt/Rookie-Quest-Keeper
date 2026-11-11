import React, { useMemo, useState } from 'react';
import { Dices, Minus, Plus, RotateCcw } from 'lucide-react';

import DiceRollFlicker from '@/components/DiceRollFlicker';
import { rollAbilityScore } from '@/data/abilityScoreRolls';
import {
  ABILITY_METHODS,
  ABILITY_ORDER,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  POINT_BUY_TOTAL,
  canSetPointBuy,
  pointBuyRemaining,
  pointBuyStart,
  scoresFromRolls,
  standardArrayScores,
  swapScores,
} from '@/data/abilityScoreMethods';
import { loadDiceDyeId } from '@/lib/diceDyePreference';
import AbilityKnob from './AbilityKnob';
import './AbilityScoreStep.css';

const NAMES = {
  strength: 'Strength', dexterity: 'Dexterity', constitution: 'Constitution',
  intelligence: 'Intelligence', wisdom: 'Wisdom', charisma: 'Charisma',
};
const SHORT = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);
const mod = (score) => Math.floor((Number(score) - 10) / 2);
const ROLLS_NEEDED = ABILITY_ORDER.length;

/**
 * Setting ability scores in the creator: standard array, point buy on a
 * dial, rolling 4d6 in the 3D dice tray, or typing them in.
 *
 * Everything is stored on the draft: `scores` always holds a complete set
 * of numbers (so the rest of the creator never sees a gap), `abilityMethod`
 * the chosen method and `rolledScores` the rolls made so far, so leaving
 * the step and coming back keeps them.
 */
export default function AbilityScoreStep({ draft, update, setScore, finalScores, bonus = {} }) {
  const method = draft.abilityMethod || 'standard';
  const scores = draft.scores || {};
  const rolled = Array.isArray(draft.rolledScores) ? draft.rolledScores : [];
  const [swapFrom, setSwapFrom] = useState(null);
  const [focus, setFocus] = useState('strength');
  const [burst, setBurst] = useState(null);

  const remaining = useMemo(() => pointBuyRemaining(scores), [scores]);
  const rollingDone = rolled.length >= ROLLS_NEEDED;
  const canSwap = method === 'standard' || (method === 'roll' && rollingDone);

  const chooseMethod = (next) => {
    if (next === method) return;
    setSwapFrom(null);
    if (next === 'standard') update({ abilityMethod: next, scores: standardArrayScores() });
    else if (next === 'point') update({ abilityMethod: next, scores: pointBuyStart() });
    else if (next === 'roll') update({ abilityMethod: next, rolledScores: [], scores: scoresFromRolls([]) });
    else update({ abilityMethod: next });
  };

  const tapAbility = (ability) => {
    if (method === 'point') {
      setFocus(ability);
      return;
    }
    if (!canSwap) return;
    if (!swapFrom) {
      setSwapFrom(ability);
      return;
    }
    update({ scores: swapScores(scores, swapFrom, ability) });
    setSwapFrom(null);
  };

  const setPoint = (ability, next) => {
    if (!canSetPointBuy(scores, ability, next)) return;
    update({ scores: { ...scores, [ability]: next } });
  };

  const addRoll = (animate) => {
    if (rollingDone) return;
    const result = rollAbilityScore();
    const nextRolled = [...rolled, { total: result.total, dice: result.dice }];
    update({ rolledScores: nextRolled, scores: scoresFromRolls(nextRolled) });
    if (animate) {
      setBurst({
        rollId: `ability-${Date.now()}-${nextRolled.length}`,
        label: `${NAMES[ABILITY_ORDER[nextRolled.length - 1]]} · 4d6, lowest dropped`,
        rolls: result.dice,
        total: result.total,
      });
    }
  };

  const rollTheRest = () => {
    const nextRolled = [...rolled];
    while (nextRolled.length < ROLLS_NEEDED) {
      const result = rollAbilityScore();
      nextRolled.push({ total: result.total, dice: result.dice });
    }
    update({ rolledScores: nextRolled, scores: scoresFromRolls(nextRolled) });
  };

  const startOver = () => {
    setSwapFrom(null);
    update({ rolledScores: [], scores: scoresFromRolls([]) });
  };

  const methodHint = {
    standard: swapFrom ? `Now tap the ability to swap with ${NAMES[swapFrom]}.` : 'Tap two abilities to swap their scores.',
    point: `Pick an ability, then turn the dial. ${remaining} of ${POINT_BUY_TOTAL} points left. Scores run ${POINT_BUY_MIN} to ${POINT_BUY_MAX} before bonuses.`,
    roll: rollingDone
      ? (swapFrom ? `Now tap the ability to swap with ${NAMES[swapFrom]}.` : 'All six rolled. Tap two abilities to swap their scores.')
      : `Roll ${NAMES[ABILITY_ORDER[rolled.length]]} next (${rolled.length} of ${ROLLS_NEEDED} rolled). Four d6 are thrown and the lowest is dropped.`,
    manual: 'Type each score from 3 to 20.',
  }[method];

  return (
    <div className="ability-step" data-testid="ability-step">
      <div className="ability-step__methods" role="radiogroup" aria-label="How to set ability scores">
        {ABILITY_METHODS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={method === option.id}
            className={method === option.id ? 'is-active' : ''}
            onClick={() => chooseMethod(option.id)}
            data-testid={`ability-method-${option.id}`}
          >
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </button>
        ))}
      </div>

      <p className="ability-step__hint" data-testid="ability-step-hint">{methodHint}</p>

      {method === 'point' && (
        <AbilityKnob
          label={NAMES[focus]}
          value={scores[focus]}
          remaining={remaining}
          canSet={(next) => canSetPointBuy(scores, focus, next)}
          onChange={(next) => setPoint(focus, next)}
        />
      )}

      {method === 'roll' && (
        <div className="ability-step__roll-actions">
          {!rollingDone && (
            <button type="button" className="is-primary" onClick={() => addRoll(true)} data-testid="ability-roll-next">
              <Dices size={18} aria-hidden="true" /> Roll {NAMES[ABILITY_ORDER[rolled.length]]}
            </button>
          )}
          {!rollingDone && (
            <button type="button" onClick={rollTheRest} data-testid="ability-roll-rest">Roll the rest quickly</button>
          )}
          {rolled.length > 0 && (
            <button type="button" onClick={startOver} data-testid="ability-roll-restart"><RotateCcw size={16} aria-hidden="true" /> Start over</button>
          )}
        </div>
      )}

      <div className="ability-step__grid">
        {ABILITY_ORDER.map((ability, index) => {
          const notRolledYet = method === 'roll' && index >= rolled.length;
          const final = finalScores?.[ability];
          const extra = bonus?.[ability] || 0;
          const selected = (method === 'point' && focus === ability) || swapFrom === ability;
          const interactive = method === 'point' || canSwap;
          return (
            <div key={ability} className={`ability-step__card${selected ? ' is-selected' : ''}${notRolledYet ? ' is-empty' : ''}`} data-testid={`ability-card-${ability}`}>
              {interactive ? (
                <button
                  type="button"
                  className="ability-step__pick"
                  aria-pressed={selected}
                  aria-label={method === 'point' ? `Adjust ${NAMES[ability]} on the dial` : `Swap ${NAMES[ability]} (${scores[ability]})`}
                  onClick={() => tapAbility(ability)}
                  data-testid={`ability-pick-${ability}`}
                >
                  <span>{SHORT[ability]}</span>
                  <strong>{scores[ability]}</strong>
                </button>
              ) : (
                <div className="ability-step__pick">
                  <span>{SHORT[ability]}</span>
                  {method === 'manual'
                    ? <input type="number" min="3" max="20" value={scores[ability]} aria-label={`${NAMES[ability]} score`} onChange={(event) => setScore(ability, event.target.value)} />
                    : <strong>{notRolledYet ? '—' : scores[ability]}</strong>}
                </div>
              )}
              {method === 'point' && (
                <div className="ability-step__stepper">
                  <button type="button" aria-label={`Lower ${NAMES[ability]}`} onClick={() => setPoint(ability, Number(scores[ability]) - 1)} disabled={!canSetPointBuy(scores, ability, Number(scores[ability]) - 1)}><Minus size={14} /></button>
                  <button type="button" aria-label={`Raise ${NAMES[ability]}`} onClick={() => setPoint(ability, Number(scores[ability]) + 1)} disabled={!canSetPointBuy(scores, ability, Number(scores[ability]) + 1)}><Plus size={14} /></button>
                </div>
              )}
              {method === 'roll' && rolled[index] && (
                <span className="ability-step__dice" aria-label={`Rolled ${rolled[index].dice?.map((die) => die.result).join(', ')}`}>
                  {(rolled[index].dice || []).map((die, dieIndex) => (
                    <i key={dieIndex} className={die.dropped ? 'is-dropped' : ''}>{die.result}</i>
                  ))}
                </span>
              )}
              {!notRolledYet && (
                <span className="ability-step__final">
                  {extra ? <em>{extra > 0 ? `+${extra}` : extra} = {final}</em> : <em>{final}</em>}
                  <b>{fmt(mod(final))}</b>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {burst && (
        <DiceRollFlicker
          key={burst.rollId}
          rollId={burst.rollId}
          isOpen
          onClose={() => setBurst(null)}
          label={burst.label}
          rolls={burst.rolls}
          total={burst.total}
          modifier={0}
          dyeId={loadDiceDyeId()}
          theme="builder"
        />
      )}
    </div>
  );
}
