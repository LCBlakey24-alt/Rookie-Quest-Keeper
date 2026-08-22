import React from 'react';
import { Dices, X } from 'lucide-react';
import './FlatDiceResultOverlay.css';

function outcomeLabel(isCrit, isFumble, isRevealed) {
  if (!isRevealed) return 'Rolling…';
  if (isCrit) return 'Critical success';
  if (isFumble) return 'Critical fail';
  return 'Roll complete';
}

export default function FlatDiceResultOverlay({
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
  return (
    <section
      className={`rq-flat-roll ${isRevealed ? 'is-revealed' : 'is-rolling'} ${isCrit ? 'is-critical' : ''} ${isFumble ? 'is-fumble' : ''}`}
      data-testid="flat-dice-overlay"
      aria-live="polite"
      aria-label="Dice roll result"
    >
      <div className="rq-flat-roll__heading">
        <span className="rq-flat-roll__status"><Dices size={15} /> {outcomeLabel(isCrit, isFumble, isRevealed)}</span>
        <button type="button" className="rq-flat-roll__close" onClick={onClose} aria-label="Close dice result">
          <X size={15} />
        </button>
      </div>

      <div className="rq-flat-roll__main">
        <div className="rq-flat-roll__copy">
          <strong title={label || 'Dice roll'}>{label || 'Dice roll'}</strong>
          <span title={rollDetail}>{isRevealed ? rollDetail : 'Calculating result…'}</span>
        </div>
        <div className="rq-flat-roll__total" data-testid="flat-dice-total">
          <small>Total</small>
          <strong>{isRevealed ? total : '—'}</strong>
        </div>
      </div>

      <div className="rq-flat-roll__dice" aria-label="Individual dice results">
        {rolls.slice(0, 12).map((die, index) => (
          <span key={die.id || `${die.sides}-${index}`} className={die.dropped ? 'is-dropped' : die.exploded ? 'is-exploded' : ''}>
            <small>d{die.sides}</small>
            <strong>{isRevealed ? die.result : '•'}</strong>
          </span>
        ))}
      </div>

      <div className="rq-flat-roll__footer">
        <span>{isRevealed ? formulaText : 'No 3D scene — just the roll.'}</span>
        {!isRevealed && (
          <button type="button" onClick={onRevealNow}>Reveal now</button>
        )}
      </div>
    </section>
  );
}
