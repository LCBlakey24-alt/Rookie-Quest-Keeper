import React from 'react';
import { Dices, X } from 'lucide-react';
import './Dice3DResultOverlay.css';

/**
 * 3D dice result overlay.
 *
 * Drop-in replacement for FlatDiceResultOverlay — identical prop contract, so
 * DiceRollFlicker can pick either. Each die is a real CSS 3D cube
 * (transform-style: preserve-3d inside a perspective stage) that tumbles while
 * the roll resolves and settles face-forward on reveal.
 *
 * Per docs/UI_DESIGN_SYSTEM.md the citrus gradient is only ever a thin rule or
 * underline, never a fill: die faces stay navy with cream numerals, and the
 * gradient appears as the heading underline and a hairline die edge.
 *
 * Motion: DiceRollFlicker renders the flat overlay instead when the viewer has
 * prefers-reduced-motion set. The CSS guard here is a second line of defence.
 */

function outcomeLabel(isCrit, isFumble, isRevealed) {
  if (!isRevealed) return 'Rolling…';
  if (isCrit) return 'Critical success';
  if (isFumble) return 'Critical fail';
  return 'Roll complete';
}

// Deterministic filler values for the five faces the viewer is not meant to
// read. Avoids Math.random so repeated renders and tests stay stable.
function fillerFace(result, sides, offset) {
  const span = Math.max(2, Number(sides) || 20);
  return (((Number(result) || 1) + offset * 7) % span) + 1;
}

const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'];

function Die({ die, index, isRevealed }) {
  const sides = Number(die.sides) || 20;
  const result = Number(die.result) || 1;
  const state = die.dropped ? 'is-dropped' : die.exploded ? 'is-exploded' : '';

  return (
    <div
      className={`rq-d3d__slot ${state}`}
      // Stagger tumbles so the dice do not move as one block. Derived from the
      // index so it is deterministic.
      style={{ '--rq-d3d-delay': `${(index % 6) * 70}ms`, '--rq-d3d-spin': `${1 + (index % 3) * 0.18}` }}
    >
      <div className="rq-d3d__stage">
        <div className={`rq-d3d__die ${isRevealed ? 'is-settled' : 'is-tumbling'}`}>
          {FACES.map((face, faceIndex) => (
            <span key={face} className={`rq-d3d__face rq-d3d__face--${face}`}>
              {face === 'front'
                ? (isRevealed ? result : '?')
                : fillerFace(result, sides, faceIndex)}
            </span>
          ))}
        </div>
      </div>
      <small className="rq-d3d__sides">
        d{sides}
        {die.dropped ? ' · dropped' : die.exploded ? ' · exploded' : ''}
      </small>
    </div>
  );
}

export default function Dice3DResultOverlay({
  total,
  label,
  rollDetail,
  formulaText,
  rolls = [],
  isRevealed = false,
  isCrit = false,
  isFumble = false,
  onRevealNow,
  onClose,
}) {
  const visible = rolls.slice(0, 12);

  return (
    <section
      className={`rq-d3d ${isRevealed ? 'is-revealed' : 'is-rolling'} ${isCrit ? 'is-critical' : ''} ${isFumble ? 'is-fumble' : ''}`}
      data-testid="dice-3d-overlay"
      aria-live="polite"
      aria-label="Dice roll result"
    >
      <div className="rq-d3d__heading">
        <span className="rq-d3d__status"><Dices size={15} /> {outcomeLabel(isCrit, isFumble, isRevealed)}</span>
        <button type="button" className="rq-d3d__close" onClick={onClose} aria-label="Close dice result">
          <X size={15} />
        </button>
      </div>

      <div className="rq-d3d__main">
        <div className="rq-d3d__copy">
          <strong title={label || 'Dice roll'}>{label || 'Dice roll'}</strong>
          <span title={rollDetail}>{isRevealed ? rollDetail : 'Calculating result…'}</span>
        </div>
        <div className="rq-d3d__total" data-testid="dice-3d-total">
          <small>Total</small>
          <strong>{isRevealed ? total : '—'}</strong>
        </div>
      </div>

      <div className="rq-d3d__tray" aria-label="Individual dice results">
        {visible.map((die, index) => (
          <Die
            key={die.id || `${die.sides}-${index}`}
            die={die}
            index={index}
            isRevealed={isRevealed}
          />
        ))}
      </div>

      <div className="rq-d3d__footer">
        <span>{isRevealed ? formulaText : 'Tumbling…'}</span>
        {!isRevealed && (
          <button type="button" onClick={onRevealNow}>Reveal now</button>
        )}
      </div>
    </section>
  );
}
