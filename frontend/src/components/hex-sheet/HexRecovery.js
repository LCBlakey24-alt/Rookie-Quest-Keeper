import React, { useEffect, useState } from 'react';

import { hitDieBlocker, recoveryState } from './recoveryModel';

/**
 * Rests and Hit Dice, under the hit-point dial. While the character is at
 * 0 HP (or still has death saves marked) a Death saves button opens the
 * Death Saves wheel. A long rest asks for a second tap, since it resets HP,
 * slots and resources.
 *
 * onRest('short' | 'long'), onSpendHitDie() and onOpenDeathSaves() are the
 * sheet's own actions.
 */
export default function HexRecovery({ character, busy = false, onRest, onSpendHitDie, onOpenDeathSaves }) {
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
        <button
          type="button"
          className={`hex-recovery__button hex-recovery__button--wide hex-recovery__death-link${state.currentHp <= 0 ? ' is-urgent' : ''}`}
          onClick={onOpenDeathSaves}
          data-testid="hex-open-death-saves"
        >
          <span className="hex-glass" aria-hidden="true" />
          <span>Death saves</span>
          <small>
            <span className="hex-recovery__count--success">{state.successes} pass</span>
            {' · '}
            <span className="hex-recovery__count--failure">{state.failures} fail</span>
          </small>
        </button>
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
