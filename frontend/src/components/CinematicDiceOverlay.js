import React from 'react';
import { Sparkles, X } from 'lucide-react';
import './CinematicDiceOverlay.css';

function getOutcomeLabel(isCrit, isFumble, isRevealed) {
  if (!isRevealed) return 'Rolling dice';
  if (isCrit) return 'Critical success';
  if (isFumble) return 'Critical fail';
  return 'Roll complete';
}

function clampResult(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return numeric;
}

export default function CinematicDiceOverlay({
  result,
  total,
  label,
  rollDetail,
  formulaText,
  isRevealed = false,
  isCrit = false,
  isFumble = false,
  diceCount = 1,
  onClose,
}) {
  const outcomeClass = isCrit ? 'is-critical' : isFumble ? 'is-fumble' : '';
  const displayResult = clampResult(result);
  const displayTotal = clampResult(total);

  return (
    <div className={`rq-cinematic-roll ${isRevealed ? 'is-revealed' : 'is-rolling'} ${outcomeClass}`}>
      <div className="rq-cinematic-roll__backdrop" />
      <div className="rq-cinematic-roll__arena" aria-label="Cinematic dice roll animation">
        <div className="rq-cinematic-roll__wall rq-cinematic-roll__wall--left" />
        <div className="rq-cinematic-roll__wall rq-cinematic-roll__wall--right" />
        <div className="rq-cinematic-roll__wall rq-cinematic-roll__wall--top" />
        <div className="rq-cinematic-roll__trail rq-cinematic-roll__trail--one" />
        <div className="rq-cinematic-roll__trail rq-cinematic-roll__trail--two" />

        <div className="rq-cinematic-roll__die-wrap">
          <div className="rq-cinematic-roll__shadow" />
          <div className="rq-cinematic-d20" aria-label={`Rolled result ${displayResult}`}>
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--one" />
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--two" />
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--three" />
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--four" />
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--five" />
            <span className="rq-cinematic-d20__ridge rq-cinematic-d20__ridge--a" />
            <span className="rq-cinematic-d20__ridge rq-cinematic-d20__ridge--b" />
            <span className="rq-cinematic-d20__ridge rq-cinematic-d20__ridge--c" />
            <span className="rq-cinematic-d20__number">{displayResult}</span>
          </div>
        </div>

        <div className="rq-cinematic-roll__burst" />
      </div>

      <section className="rq-cinematic-roll__panel" aria-live="polite">
        <div className="rq-cinematic-roll__status"><Sparkles size={15} /> {getOutcomeLabel(isCrit, isFumble, isRevealed)}</div>
        <h3 title={label || 'Dice roll'}>{label || 'Dice roll'}</h3>
        <p title={rollDetail}>{isRevealed ? rollDetail : `A sunset d20 is bouncing through the roll tray${diceCount > 1 ? ` for ${diceCount} dice` : ''}.`}</p>
        <div className="rq-cinematic-roll__total">
          <span>{isRevealed ? 'Total' : 'Rolling'}</span>
          <strong>{isRevealed ? displayTotal : '—'}</strong>
          {isRevealed && <em>{formulaText}</em>}
        </div>
      </section>

      <button type="button" className="rq-cinematic-roll__close" onClick={onClose} aria-label="Dismiss roll result">
        <X size={17} />
      </button>
    </div>
  );
}
