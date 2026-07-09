import React from 'react';
import { Sparkles, X, Zap } from 'lucide-react';
import './CinematicDiceOverlay.css';

const PARTICLES = Array.from({ length: 14 }, (_, index) => index + 1);

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
  onRevealNow,
  onClose,
}) {
  const outcomeClass = isCrit ? 'is-critical' : isFumble ? 'is-fumble' : '';
  const displayResult = clampResult(result);
  const displayTotal = clampResult(total);
  const outcomeLabel = getOutcomeLabel(isCrit, isFumble, isRevealed);

  return (
    <div
      className={`rq-cinematic-roll ${isRevealed ? 'is-revealed' : 'is-rolling'} ${outcomeClass}`}
      data-testid="cinematic-dice-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cinematic-dice-title"
      aria-describedby="cinematic-dice-description"
    >
      <div className="rq-cinematic-roll__backdrop" />
      <div className="rq-cinematic-roll__arena" aria-label="Cinematic dice roll animation" data-testid="cinematic-dice-arena">
        <div className="rq-cinematic-roll__wall rq-cinematic-roll__wall--left" />
        <div className="rq-cinematic-roll__wall rq-cinematic-roll__wall--right" />
        <div className="rq-cinematic-roll__wall rq-cinematic-roll__wall--top" />
        <div className="rq-cinematic-roll__trail rq-cinematic-roll__trail--one" />
        <div className="rq-cinematic-roll__trail rq-cinematic-roll__trail--two" />

        <div className="rq-cinematic-roll__impact rq-cinematic-roll__impact--one" />
        <div className="rq-cinematic-roll__impact rq-cinematic-roll__impact--two" />
        <div className="rq-cinematic-roll__impact rq-cinematic-roll__impact--three" />

        <div className="rq-cinematic-roll__particles" aria-hidden="true">
          {PARTICLES.map(index => <span key={index} className={`rq-cinematic-roll__particle rq-cinematic-roll__particle--${index}`} />)}
        </div>

        <div className="rq-cinematic-roll__die-wrap" aria-hidden="true">
          <div className="rq-cinematic-roll__shadow" />
          <div className="rq-cinematic-d20" data-testid="cinematic-d20">
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--one" />
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--two" />
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--three" />
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--four" />
            <span className="rq-cinematic-d20__facet rq-cinematic-d20__facet--five" />
            <span className="rq-cinematic-d20__ridge rq-cinematic-d20__ridge--a" />
            <span className="rq-cinematic-d20__ridge rq-cinematic-d20__ridge--b" />
            <span className="rq-cinematic-d20__ridge rq-cinematic-d20__ridge--c" />
            <span className="rq-cinematic-d20__number" data-testid="cinematic-dice-number">{displayResult}</span>
          </div>
        </div>

        <div className="rq-cinematic-roll__burst" />
      </div>

      <section className="rq-cinematic-roll__panel" aria-live="polite" aria-atomic="true" data-testid="cinematic-dice-panel">
        <div className="rq-cinematic-roll__status" data-testid="cinematic-dice-status"><Sparkles size={15} /> {outcomeLabel}</div>
        <h3 id="cinematic-dice-title" title={label || 'Dice roll'}>{label || 'Dice roll'}</h3>
        <p id="cinematic-dice-description" title={rollDetail}>{isRevealed ? rollDetail : `A sunset d20 is bouncing through the roll tray${diceCount > 1 ? ` for ${diceCount} dice` : ''}.`}</p>
        <div className="rq-cinematic-roll__actions">
          {!isRevealed && (
            <button type="button" onClick={onRevealNow} className="rq-cinematic-roll__reveal-now" data-testid="cinematic-dice-reveal-now" autoFocus>
              <Zap size={13} /> Reveal now
            </button>
          )}
          <span>Esc closes · Enter/Space reveals</span>
        </div>
        <div className="rq-cinematic-roll__total" data-testid="cinematic-dice-total" aria-label={isRevealed ? `Total ${displayTotal}` : 'Rolling'}>
          <span>{isRevealed ? 'Total' : 'Rolling'}</span>
          <strong>{isRevealed ? displayTotal : '—'}</strong>
          {isRevealed && <em>{formulaText}</em>}
        </div>
      </section>

      <button type="button" className="rq-cinematic-roll__close" onClick={onClose} aria-label="Dismiss roll result" data-testid="cinematic-dice-close">
        <X size={17} />
      </button>
    </div>
  );
}
