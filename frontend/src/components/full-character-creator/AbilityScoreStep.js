import React, { useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

import DiceRollFlicker from '@/components/DiceRollFlicker';
import { rollAbilityScore } from '@/data/abilityScoreRolls';
import {
  ABILITY_METHODS,
  ABILITY_ORDER,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  POINT_BUY_TOTAL,
  STANDARD_ARRAY,
  addRollFor,
  assignRoll,
  assignValue,
  canSetPointBuy,
  migrateRolls,
  pointBuyRemaining,
  pointBuyStart,
  scoresFromRolls,
  standardArrayScores,
} from '@/data/abilityScoreMethods';
import { loadDiceDyeId } from '@/lib/diceDyePreference';
import GuildChoiceWheel from '@/components/guild-motif/GuildChoiceWheel';
import './AbilityScoreStep.css';

const NAMES = {
  strength: 'Strength', dexterity: 'Dexterity', constitution: 'Constitution',
  intelligence: 'Intelligence', wisdom: 'Wisdom', charisma: 'Charisma',
};
const SHORT = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);
const mod = (score) => Math.floor((Number(score) - 10) / 2);
const ROLLS_NEEDED = ABILITY_ORDER.length;
const ABILITY_VIEW_KEY = 'rqk.creator.abilityView';
function loadAbilityView() {
  try { return window.localStorage.getItem(ABILITY_VIEW_KEY) === 'list' ? 'list' : 'wheel'; } catch { return 'wheel'; }
}

/**
 * Setting ability scores in the creator, on six wheels, one per ability,
 * each with its score in the centre hexagon:
 *
 * - Point buy: turn a wheel through 8-15; scores you cannot afford are dimmed.
 * - Roll 4d6: tap a wheel's centre to throw that ability's dice in the 3D
 *   tray. Once all six are rolled, turn a wheel to the roll you want; the
 *   ability that had it takes this one's in exchange.
 * - Standard array: turn a wheel to the value you want; values swap the same way.
 * - Manual: type each score.
 *
 * Everything is stored on the draft: `scores` always holds a complete set
 * of numbers (so the rest of the creator never sees a gap), `abilityMethod`
 * the chosen method and `rolledScores` the rolls made so far, each naming
 * its ability, so leaving the step and coming back keeps them.
 */
export default function AbilityScoreStep({ draft, update, setScore, finalScores, bonus = {} }) {
  const method = draft.abilityMethod || 'standard';
  const scores = draft.scores || {};
  const rolled = useMemo(() => migrateRolls(draft.rolledScores, draft.scores), [draft.rolledScores, draft.scores]);
  const [view, setView] = useState(loadAbilityView);
  const switchView = (next) => {
    setView(next);
    try { window.localStorage.setItem(ABILITY_VIEW_KEY, next); } catch { /* storage unavailable */ }
  };
  const [burst, setBurst] = useState(null);

  const remaining = useMemo(() => pointBuyRemaining(scores), [scores]);
  const rolledAbilities = new Set(rolled.map((entry) => entry.ability));
  const rollingDone = ABILITY_ORDER.every((ability) => rolledAbilities.has(ability));

  const chooseMethod = (next) => {
    if (next === method) return;
    if (next === 'standard') update({ abilityMethod: next, scores: standardArrayScores() });
    else if (next === 'point') update({ abilityMethod: next, scores: pointBuyStart() });
    else if (next === 'roll') update({ abilityMethod: next, rolledScores: [], scores: scoresFromRolls([]) });
    else update({ abilityMethod: next });
  };

  const setPoint = (ability, next) => {
    if (!canSetPointBuy(scores, ability, next)) return;
    update({ scores: { ...scores, [ability]: next } });
  };

  const rollFor = (ability) => {
    if (rolledAbilities.has(ability)) return;
    const result = rollAbilityScore();
    const nextRolled = addRollFor(rolled, ability, result);
    update({ rolledScores: nextRolled, scores: scoresFromRolls(nextRolled) });
    setBurst({
      rollId: `ability-${ability}-${Date.now()}`,
      label: `${NAMES[ability]} · 4d6, lowest dropped`,
      rolls: result.dice,
      total: result.total,
    });
  };

  const rollTheRest = () => {
    let nextRolled = rolled;
    ABILITY_ORDER.forEach((ability) => {
      if (!rolledAbilities.has(ability)) nextRolled = addRollFor(nextRolled, ability, rollAbilityScore());
    });
    update({ rolledScores: nextRolled, scores: scoresFromRolls(nextRolled) });
  };

  const startOver = () => update({ rolledScores: [], scores: scoresFromRolls([]) });

  const rolledCount = ABILITY_ORDER.filter((ability) => rolledAbilities.has(ability)).length;
  const methodHint = {
    standard: 'Turn a wheel to give that ability a score; the ability that had it takes the other in exchange.',
    point: `Turn each wheel to set its score. ${remaining} of ${POINT_BUY_TOTAL} points left. Scores run ${POINT_BUY_MIN} to ${POINT_BUY_MAX} before bonuses.`,
    roll: rollingDone
      ? 'All six rolled. Turn a wheel to the roll you want for that ability; the two swap.'
      : `Tap a wheel's centre to roll that ability (${rolledCount} of ${ROLLS_NEEDED} rolled). Four d6 are thrown and the lowest is dropped.`,
    manual: 'Type each score from 3 to 20.',
  }[method];
  // In the list view the same rules apply; only the wording changes.
  const hint = view === 'list' && method !== 'manual'
    ? methodHint
      .replace('Turn a wheel to give that ability a score', 'Pick a score for an ability')
      .replace('Turn each wheel to set its score', 'Pick each score')
      .replace("Tap a wheel's centre to roll that ability", 'Roll each ability')
      .replace('Turn a wheel to the roll you want for that ability', 'Pick the roll you want for each ability')
    : methodHint;

  // What each ability's wheel offers, and what turning it does.
  const wheelFor = (ability) => {
    if (method === 'point') {
      const values = Array.from({ length: POINT_BUY_MAX - POINT_BUY_MIN + 1 }, (_, i) => POINT_BUY_MIN + i);
      return {
        options: values.map((v) => ({ id: String(v), label: String(v), short: String(v) })),
        value: String(scores[ability]),
        disabledIds: values.filter((v) => v !== Number(scores[ability]) && !canSetPointBuy(scores, ability, v)).map(String),
        onChange: (id) => setPoint(ability, Number(id)),
      };
    }
    if (method === 'standard') {
      return {
        options: STANDARD_ARRAY.map((v) => ({ id: String(v), label: String(v), short: String(v) })),
        value: String(scores[ability]),
        onChange: (id) => update({ scores: assignValue(scores, ability, Number(id)) }),
      };
    }
    // Roll: the ring holds the rolls so far plus a "?" for each ability still to roll.
    const options = [
      ...rolled.map((entry, index) => ({ id: `r${index}`, label: String(entry.total), short: String(entry.total) })),
      ...ABILITY_ORDER.filter((other) => !rolledAbilities.has(other)).map((other) => ({ id: `p-${other}`, label: `${NAMES[other]} not rolled`, short: '?' })),
    ];
    const own = rolled.findIndex((entry) => entry.ability === ability);
    return {
      options,
      value: own >= 0 ? `r${own}` : `p-${ability}`,
      // Rolls can be traded only once all six are in.
      disabledIds: rollingDone ? [] : options.map((option) => option.id),
      onChange: (id) => {
        if (!rollingDone || !id.startsWith('r')) return;
        const nextRolled = assignRoll(rolled, ability, Number(id.slice(1)));
        update({ rolledScores: nextRolled, scores: scoresFromRolls(nextRolled) });
      },
      onConfirm: own >= 0 ? undefined : () => rollFor(ability),
    };
  };

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

      <p className="ability-step__hint" data-testid="ability-step-hint">{hint}</p>

      {method === 'roll' && (
        <div className="ability-step__roll-actions">
          {!rollingDone && (
            <button type="button" onClick={rollTheRest} data-testid="ability-roll-rest">Roll the rest quickly</button>
          )}
          {rolled.length > 0 && (
            <button type="button" onClick={startOver} data-testid="ability-roll-restart"><RotateCcw size={16} aria-hidden="true" /> Start over</button>
          )}
        </div>
      )}

      {method !== 'manual' && (
        <button type="button" className="ability-step__view-toggle" onClick={() => switchView(view === 'list' ? 'wheel' : 'list')} data-testid="ability-view-toggle">
          {view === 'list' ? 'Show as wheels' : 'Show as list'}
        </button>
      )}

      {method !== 'manual' && view === 'list' && (
        <ul className="ability-step__list" data-testid="ability-list">
          {ABILITY_ORDER.map((ability) => {
            const wheel = wheelFor(ability);
            const notRolledYet = method === 'roll' && !rolledAbilities.has(ability);
            const blocked = new Set(wheel.disabledIds || []);
            return (
              <li key={ability} className="ability-step__list-row" data-testid={`ability-row-${ability}`}>
                <label htmlFor={`ability-list-${ability}`}>{NAMES[ability]}</label>
                {notRolledYet ? (
                  <button type="button" onClick={wheel.onConfirm} data-testid={`ability-list-roll-${ability}`}>Roll {NAMES[ability]}</button>
                ) : (
                  <select
                    id={`ability-list-${ability}`}
                    value={wheel.value}
                    disabled={method === 'roll' && !rollingDone}
                    onChange={(event) => wheel.onChange(event.target.value)}
                  >
                    {wheel.options.filter((option) => !option.id.startsWith('p-')).map((option) => (
                      <option key={option.id} value={option.id} disabled={blocked.has(option.id) && option.id !== wheel.value}>{option.label}</option>
                    ))}
                  </select>
                )}
                <b>{notRolledYet ? '—' : fmt(mod(finalScores?.[ability]))}</b>
              </li>
            );
          })}
        </ul>
      )}

      {method === 'manual' ? (
        <div className="ability-step__grid">
          {ABILITY_ORDER.map((ability) => {
            const final = finalScores?.[ability];
            const extra = bonus?.[ability] || 0;
            return (
              <div key={ability} className="ability-step__card" data-testid={`ability-card-${ability}`}>
                <div className="ability-step__pick">
                  <span>{SHORT[ability]}</span>
                  <input type="number" min="3" max="20" value={scores[ability]} aria-label={`${NAMES[ability]} score`} onChange={(event) => setScore(ability, event.target.value)} />
                </div>
                <span className="ability-step__final">
                  {extra ? <em>{extra > 0 ? `+${extra}` : extra} = {final}</em> : <em>{final}</em>}
                  <b>{fmt(mod(final))}</b>
                </span>
              </div>
            );
          })}
        </div>
      ) : view === 'list' ? null : (
        <div className="ability-step__wheels">
          {ABILITY_ORDER.map((ability) => {
            const wheel = wheelFor(ability);
            const notRolledYet = method === 'roll' && !rolledAbilities.has(ability);
            const final = finalScores?.[ability];
            const extra = bonus?.[ability] || 0;
            const roll = rolled.find((entry) => entry.ability === ability);
            return (
              <div key={ability} className={`ability-step__wheel-card${notRolledYet ? ' is-empty' : ''}`} data-testid={`ability-card-${ability}`}>
                <GuildChoiceWheel
                  compact
                  label={NAMES[ability]}
                  caption={SHORT[ability]}
                  options={wheel.options}
                  value={wheel.value}
                  disabledIds={wheel.disabledIds}
                  onChange={wheel.onChange}
                  onConfirm={wheel.onConfirm}
                  confirmLabel="ROLL"
                  confirmAria={`Roll ${NAMES[ability]}: four d6, lowest dropped`}
                  centreText={notRolledYet ? '—' : String(scores[ability])}
                  centreNote={notRolledYet ? undefined : fmt(mod(final))}
                />
                {method === 'point' && (
                  <div className="ability-step__stepper">
                    <button type="button" aria-label={`Lower ${NAMES[ability]}`} onClick={() => setPoint(ability, Number(scores[ability]) - 1)} disabled={!canSetPointBuy(scores, ability, Number(scores[ability]) - 1)}><Minus size={14} /></button>
                    <button type="button" aria-label={`Raise ${NAMES[ability]}`} onClick={() => setPoint(ability, Number(scores[ability]) + 1)} disabled={!canSetPointBuy(scores, ability, Number(scores[ability]) + 1)}><Plus size={14} /></button>
                  </div>
                )}
                {roll && (
                  <span className="ability-step__dice" aria-label={`Rolled ${roll.dice?.map((die) => die.result).join(', ')}`}>
                    {(roll.dice || []).map((die, dieIndex) => (
                      <i key={dieIndex} className={die.dropped ? 'is-dropped' : ''}>{die.result}</i>
                    ))}
                  </span>
                )}
                {!notRolledYet && extra !== 0 && (
                  <span className="ability-step__final"><em>{extra > 0 ? `+${extra}` : extra} = {final}</em></span>
                )}
              </div>
            );
          })}
        </div>
      )}

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
