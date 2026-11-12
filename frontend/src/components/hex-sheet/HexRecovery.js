import React, { useEffect, useState } from 'react';

import { deathSavePipUpdates, hitDieBlocker, recoveryState } from './recoveryModel';

// A pointy-top hexagon cut into six wedges. Successes fill the right side and
// failures the left, each from the top wedge down; the centre rolls the save.
const OUTER = 94;
const INNER = 40;
const vertex = (radius, step) => {
  const angle = ((step * 60) - 90) * (Math.PI / 180);
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
};
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const toPoints = (points) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
function wedgePoints(step) {
  const gap = 0.035; // a thin gap between neighbouring wedges
  const o1 = vertex(OUTER, step);
  const o2 = vertex(OUTER, step + 1);
  const i1 = vertex(INNER + 4, step);
  const i2 = vertex(INNER + 4, step + 1);
  return toPoints([lerp(o1, o2, gap), lerp(o1, o2, 1 - gap), lerp(i1, i2, 1 - gap * 2), lerp(i1, i2, gap * 2)]);
}
// Steps count clockwise from the top vertex: 0 top-right, 1 right, 2 bottom-right,
// 3 bottom-left, 4 left, 5 top-left.
export const DEATH_WEDGES = [
  { type: 'success', index: 1, points: wedgePoints(0) },
  { type: 'success', index: 2, points: wedgePoints(1) },
  { type: 'success', index: 3, points: wedgePoints(2) },
  { type: 'failure', index: 1, points: wedgePoints(5) },
  { type: 'failure', index: 2, points: wedgePoints(4) },
  { type: 'failure', index: 3, points: wedgePoints(3) },
];
const CENTRE_POINTS = toPoints([0, 1, 2, 3, 4, 5].map((step) => vertex(INNER, step)));

/**
 * Rests, Hit Dice and death saves, under the hit-point dial. Death saves
 * appear while the character is at 0 HP (or still has saves marked), as a
 * hexagon wheel that fills from the top wedge down. A long
 * rest asks for a second tap, since it resets HP, slots and resources.
 *
 * onRest('short' | 'long'), onSpendHitDie(), onRollDeathSave() and
 * onPatch(updates, options) are the sheet's own save and roll actions.
 */
export default function HexRecovery({ character, busy = false, onRest, onSpendHitDie, onRollDeathSave, onPatch }) {
  const state = recoveryState(character);
  const [confirmLong, setConfirmLong] = useState(false);
  useEffect(() => {
    if (!confirmLong) return undefined;
    const timer = setTimeout(() => setConfirmLong(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmLong]);

  const hitDieReason = hitDieBlocker(state);
  const longRest = () => {
    if (!confirmLong) {
      setConfirmLong(true);
      return;
    }
    setConfirmLong(false);
    onRest('long');
  };

  return (
    <section className="hex-recovery" aria-label="Rest and recovery" data-testid="hex-recovery">
      {state.showDeathSaves && (
        <div className="hex-recovery__death" role="group" aria-label="Death saves" data-testid="hex-death-saves">
          <p className="hex-recovery__status" aria-live="polite">
            {state.dead ? 'Three failures: your character has died.' : state.stable ? 'Stable at 0 HP.' : state.currentHp <= 0 ? 'Dying: roll a death save each turn.' : 'Death saves still marked.'}
          </p>
          <div className="hex-recovery__wheel-labels" aria-hidden="true">
            <span className="hex-recovery__label--failure">Failures</span>
            <span className="hex-recovery__label--success">Successes</span>
          </div>
          <div className="hex-recovery__wheel">
            <svg viewBox="-100 -100 200 200" className="hex-recovery__svg" aria-hidden="false">
              {DEATH_WEDGES.map((wedge) => {
                const count = wedge.type === 'success' ? state.successes : state.failures;
                const label = wedge.type === 'success' ? 'Success' : 'Failure';
                const marked = count >= wedge.index;
                const press = () => { if (!busy) onPatch(deathSavePipUpdates(state, wedge.type, wedge.index), { error: 'Could not update death saves' }); };
                return (
                  <g
                    key={`${wedge.type}-${wedge.index}`}
                    role="button"
                    tabIndex={busy ? -1 : 0}
                    aria-label={`${label} ${wedge.index} of 3`}
                    aria-pressed={marked}
                    aria-disabled={busy || undefined}
                    className={`hex-recovery__wedge hex-recovery__wedge--${wedge.type}${marked ? ' is-marked' : ''}`}
                    data-testid={`hex-death-${wedge.type}-${wedge.index}`}
                    onClick={press}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); press(); } }}
                  >
                    <polygon points={wedge.points} />
                  </g>
                );
              })}
              <polygon className="hex-recovery__centre-edge" points={CENTRE_POINTS} aria-hidden="true" />
            </svg>
            <button
              type="button"
              className="hex-recovery__roll"
              disabled={busy || state.dead || state.stable || state.currentHp > 0}
              onClick={onRollDeathSave}
              data-testid="hex-roll-death-save"
            >
              <span>Roll</span>
              <small>death save</small>
            </button>
          </div>
          <button
            type="button"
            className="hex-sheet__text-button hex-recovery__clear"
            disabled={busy}
            onClick={() => onPatch({ death_saves_successes: 0, death_saves_failures: 0 }, { success: 'Death saves cleared', error: 'Could not clear death saves' })}
            data-testid="hex-clear-death-saves"
          >
            Clear death saves
          </button>
        </div>
      )}

      <button
        type="button"
        className="hex-recovery__button hex-recovery__button--wide"
        disabled={busy || Boolean(hitDieReason)}
        title={hitDieReason || undefined}
        onClick={onSpendHitDie}
        data-testid="hex-spend-hit-die"
      >
        <span className="hex-glass" aria-hidden="true" />
        <span>Spend Hit Die</span>
        <small>d{state.hitDieSides} · {state.hitDiceRemaining} of {state.hitDiceTotal} left</small>
      </button>
      {hitDieReason && <p className="hex-recovery__hint">{hitDieReason}</p>}

      <div className="hex-recovery__row">
        <button type="button" className="hex-recovery__button" disabled={busy} onClick={() => onRest('short')} data-testid="hex-short-rest">
          <span className="hex-glass" aria-hidden="true" />
          Short rest
        </button>
        <button type="button" className="hex-recovery__button" disabled={busy} onClick={longRest} data-testid="hex-long-rest" aria-describedby={confirmLong ? 'hex-long-rest-note' : undefined}>
          <span className="hex-glass" aria-hidden="true" />
          {confirmLong ? 'Tap again to rest' : 'Long rest'}
        </button>
      </div>
      {confirmLong && <p id="hex-long-rest-note" className="hex-recovery__hint">A long rest restores HP, Hit Dice, spell slots and resources.</p>}
    </section>
  );
}
