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
  PHYSICAL_MAX,
  PHYSICAL_MIN,
  addRollInSlot,
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
const SLOTS = [0, 1, 2, 3, 4, 5];
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
  const rollingDone = rolled.length >= ROLLS_NEEDED;
  const rolledCount = rolled.length;

  const chooseMethod = (next) => {
    if (next === method) return;
    if (next === 'standard') update({ abilityMethod: next, scores: standardArrayScores() });
    else if (next === 'point') update({ abilityMethod: next, scores: pointBuyStart() });
    else if (next === 'roll') update({ abilityMethod: next, rolledScores: [], scores: scoresFromRolls([]) });
    else if (next === 'physical') {
      const clamped = Object.fromEntries(ABILITY_ORDER.map((ability) => [
        ability, Math.max(PHYSICAL_MIN, Math.min(PHYSICAL_MAX, Number(scores[ability]) || 10)),
      ]));
      update({ abilityMethod: next, scores: clamped });
    } else update({ abilityMethod: next });
  };

  const setPoint = (ability, next) => {
    if (!canSetPointBuy(scores, ability, next)) return;
    update({ scores: { ...scores, [ability]: next } });
  };

  const saveRolls = (nextRolled) => update({ rolledScores: nextRolled, scores: scoresFromRolls(nextRolled) });

  // Roll 4d6 on one roll wheel, in the 3D tray.
  const rollSlot = (slot) => {
    if (rolled.some((entry) => entry.slot === slot)) return;
    const result = rollAbilityScore();
    saveRolls(addRollInSlot(rolled, slot, result));
    setBurst({
      rollId: `ability-roll-${slot}-${Date.now()}`,
      label: `Roll ${slot + 1} · 4d6, lowest dropped`,
      rolls: result.dice,
      total: result.total,
    });
  };

  const rollTheRest = () => {
    let nextRolled = rolled;
    SLOTS.forEach((slot) => {
      if (!nextRolled.some((entry) => entry.slot === slot)) nextRolled = addRollInSlot(nextRolled, slot, rollAbilityScore());
    });
    saveRolls(nextRolled);
  };

  const startOver = () => saveRolls([]);

  const methodHint = {
    standard: 'Turn a wheel to give that ability a score; the ability that had it takes the other in exchange.',
    point: `Turn each wheel to set its score. ${remaining} of ${POINT_BUY_TOTAL} points left. Scores run ${POINT_BUY_MIN} to ${POINT_BUY_MAX} before bonuses.`,
    roll: rollingDone
      ? 'All six rolled. Turn each wheel to the ability that roll should go to; if another roll has it, the two swap.'
      : `Tap a wheel's centre to roll 4d6, lowest dropped (${rolledCount} of ${ROLLS_NEEDED} rolled). Then turn each wheel to the ability that roll should go to.`,
    physical: `Roll 4d6 at the table and drop the lowest die, then turn each ability's wheel to your total (${PHYSICAL_MIN} to ${PHYSICAL_MAX}).`,
    manual: 'Type each score from 3 to 20.',
  }[method];
  // In the list view the same rules apply; only the wording changes.
  const hint = view === 'list' && method !== 'manual'
    ? methodHint
      .replace('Turn a wheel to give that ability a score', 'Pick a score for an ability')
      .replace('Turn each wheel to set its score', 'Pick each score')
      .replace("Tap a wheel's centre to roll 4d6", 'Roll 4d6 for each row')
      .replace('Turn each wheel to the ability', 'Pick the ability')
      .replace('Then turn each wheel to the ability', 'Then pick the ability')
      .replace("turn each ability's wheel to your total", 'pick each total')
    : methodHint;

  const numberOptions = (values) => values.map((v) => ({ id: String(v), label: String(v), short: String(v) }));
  const abilityOptions = ABILITY_ORDER.map((ability) => ({ id: ability, label: NAMES[ability], short: SHORT[ability] }));

  /*
   * One spec per wheel. For roll 4d6 the six wheels are the six rolls: the
   * centre shows the total and the wedges are the abilities it can go to.
   * For every other method the six wheels are the six abilities and the
   * wedges are the scores.
   */
  const specs = method === 'roll'
    ? SLOTS.map((slot) => {
      const index = rolled.findIndex((entry) => entry.slot === slot);
      const entry = rolled[index];
      if (!entry) {
        const held = new Set(rolled.map((other) => other.ability));
        const next = held.has(ABILITY_ORDER[slot]) ? ABILITY_ORDER.find((ability) => !held.has(ability)) : ABILITY_ORDER[slot];
        return {
          key: `roll-${slot}`, testId: `ability-roll-slot-${slot}`, label: `Roll ${slot + 1}`, caption: `ROLL ${slot + 1}`,
          options: abilityOptions, value: next, disabledIds: ABILITY_ORDER, onChange: () => {},
          onConfirm: () => rollSlot(slot), confirmAria: `Roll 4d6 for roll ${slot + 1}`,
          centreText: '—', empty: true,
        };
      }
      const final = finalScores?.[entry.ability];
      return {
        key: `roll-${slot}`, testId: `ability-roll-slot-${slot}`, label: `Roll ${slot + 1}`, caption: `ROLL ${slot + 1}`,
        options: abilityOptions, value: entry.ability,
        onChange: (ability) => saveRolls(assignRoll(rolled, ability, index)),
        centreText: String(entry.total), centreNote: fmt(mod(final)),
        roll: entry, ability: entry.ability,
      };
    })
    : ABILITY_ORDER.map((ability) => {
      const base = {
        key: ability, testId: `ability-card-${ability}`, label: NAMES[ability], caption: SHORT[ability],
        centreText: String(scores[ability]), centreNote: fmt(mod(finalScores?.[ability])), ability,
      };
      if (method === 'point') {
        const values = Array.from({ length: POINT_BUY_MAX - POINT_BUY_MIN + 1 }, (_, i) => POINT_BUY_MIN + i);
        return {
          ...base,
          options: numberOptions(values),
          value: String(scores[ability]),
          disabledIds: values.filter((v) => v !== Number(scores[ability]) && !canSetPointBuy(scores, ability, v)).map(String),
          onChange: (id) => setPoint(ability, Number(id)),
          stepper: true,
        };
      }
      if (method === 'physical') {
        const values = Array.from({ length: PHYSICAL_MAX - PHYSICAL_MIN + 1 }, (_, i) => PHYSICAL_MIN + i);
        return {
          ...base,
          options: numberOptions(values),
          value: String(scores[ability]),
          onChange: (id) => update({ scores: { ...scores, [ability]: Number(id) } }),
        };
      }
      return {
        ...base,
        options: numberOptions(STANDARD_ARRAY),
        value: String(scores[ability]),
        onChange: (id) => update({ scores: assignValue(scores, ability, Number(id)) }),
      };
    });

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
          {specs.map((spec) => {
            const blocked = new Set(spec.disabledIds || []);
            const selectId = `ability-list-${spec.key}`;
            return (
              <li key={spec.key} className="ability-step__list-row" data-testid={`ability-row-${spec.key}`}>
                <label htmlFor={selectId}>{method === 'roll' && !spec.empty ? `${spec.label}: ${spec.centreText}` : spec.label}</label>
                {spec.empty ? (
                  <button type="button" onClick={spec.onConfirm} data-testid={`ability-list-roll-${spec.key}`}>Roll 4d6</button>
                ) : (
                  <select id={selectId} value={spec.value} onChange={(event) => spec.onChange(event.target.value)}>
                    {spec.options.map((option) => (
                      <option key={option.id} value={option.id} disabled={blocked.has(option.id) && option.id !== spec.value}>{option.label}</option>
                    ))}
                  </select>
                )}
                <b>{spec.empty ? '—' : spec.centreNote}</b>
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
          {specs.map((spec) => {
            const final = spec.ability ? finalScores?.[spec.ability] : null;
            const extra = spec.ability ? bonus?.[spec.ability] || 0 : 0;
            return (
              <div key={spec.key} className={`ability-step__wheel-card${spec.empty ? ' is-empty' : ''}`} data-testid={spec.testId}>
                <GuildChoiceWheel
                  compact
                  tickOnTurn={method !== 'roll'}
                  label={spec.label}
                  caption={spec.caption}
                  options={spec.options}
                  value={spec.value}
                  disabledIds={spec.disabledIds}
                  onChange={spec.onChange}
                  onConfirm={spec.empty ? spec.onConfirm : undefined}
                  confirmLabel="ROLL"
                  confirmAria={spec.confirmAria}
                  centreText={spec.centreText}
                  centreNote={spec.empty ? undefined : spec.centreNote}
                />
                {method === 'roll' && !spec.empty && (
                  <span className="ability-step__assigned" data-testid={`${spec.testId}-ability`}>→ {NAMES[spec.ability]}</span>
                )}
                {spec.stepper && (
                  <div className="ability-step__stepper">
                    <button type="button" aria-label={`Lower ${NAMES[spec.ability]}`} onClick={() => setPoint(spec.ability, Number(scores[spec.ability]) - 1)} disabled={!canSetPointBuy(scores, spec.ability, Number(scores[spec.ability]) - 1)}><Minus size={14} /></button>
                    <button type="button" aria-label={`Raise ${NAMES[spec.ability]}`} onClick={() => setPoint(spec.ability, Number(scores[spec.ability]) + 1)} disabled={!canSetPointBuy(scores, spec.ability, Number(scores[spec.ability]) + 1)}><Plus size={14} /></button>
                  </div>
                )}
                {spec.roll && (
                  <span className="ability-step__dice" aria-label={`Rolled ${spec.roll.dice?.map((die) => die.result).join(', ')}`}>
                    {(spec.roll.dice || []).map((die, dieIndex) => (
                      <i key={dieIndex} className={die.dropped ? 'is-dropped' : ''}>{die.result}</i>
                    ))}
                  </span>
                )}
                {!spec.empty && extra !== 0 && (
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
