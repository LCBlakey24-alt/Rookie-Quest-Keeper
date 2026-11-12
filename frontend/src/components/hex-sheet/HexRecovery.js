import React, { useEffect, useState } from 'react';

import { deathSavePipUpdates, hitDieBlocker, recoveryState } from './recoveryModel';

const PIPS = [1, 2, 3];

/**
 * Rests, Hit Dice and death saves, under the hit-point dial. Death saves
 * appear while the character is at 0 HP (or still has saves marked). A long
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
          {['success', 'failure'].map((type) => {
            const count = type === 'success' ? state.successes : state.failures;
            const label = type === 'success' ? 'Successes' : 'Failures';
            return (
              <div key={type} className={`hex-recovery__pips hex-recovery__pips--${type}`}>
                <span>{label}</span>
                {PIPS.map((index) => (
                  <button
                    key={index}
                    type="button"
                    className="hex-recovery__pip"
                    aria-label={`${label}: ${index}`}
                    aria-pressed={count >= index}
                    disabled={busy}
                    data-testid={`hex-death-${type}-${index}`}
                    onClick={() => onPatch(deathSavePipUpdates(state, type, index), { error: 'Could not update death saves' })}
                  >
                    <span className="hex-recovery__pip-fill" aria-hidden="true" />
                  </button>
                ))}
              </div>
            );
          })}
          <div className="hex-recovery__row">
            <button type="button" className="hex-recovery__button" disabled={busy || state.dead || state.stable || state.currentHp > 0} onClick={onRollDeathSave} data-testid="hex-roll-death-save">
              <span className="hex-glass" aria-hidden="true" />
              Roll death save
            </button>
            <button
              type="button"
              className="hex-sheet__text-button"
              disabled={busy}
              onClick={() => onPatch({ death_saves_successes: 0, death_saves_failures: 0 }, { success: 'Death saves cleared', error: 'Could not clear death saves' })}
              data-testid="hex-clear-death-saves"
            >
              Clear
            </button>
          </div>
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
