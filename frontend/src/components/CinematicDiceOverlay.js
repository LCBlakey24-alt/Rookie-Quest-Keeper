import React from 'react';
import { Sparkles, X, Zap } from 'lucide-react';
import { DICE_ROLLER_MODES, normaliseDiceRollerMode } from '@/lib/diceRollerPreferences';
import './CinematicDiceOverlay.css';
import './DiceFormationOverlay.css';

const PARTICLES = Array.from({ length: 14 }, (_, index) => index + 1);
const SUPPORTED_DICE = [4, 6, 8, 10, 12, 20, 100];

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

function supportedSides(value) {
  const sides = Number(value) || 20;
  return SUPPORTED_DICE.includes(sides) ? sides : 20;
}

function buildDisplayDice(rolls = [], fallbackResult = 0) {
  const dice = Array.isArray(rolls)
    ? rolls
      .filter(roll => roll && Number.isFinite(Number(typeof roll === 'object' ? roll.result : roll)))
      .map((roll, index) => {
        const raw = typeof roll === 'object' ? roll : { result: roll, sides: 20 };
        const sides = supportedSides(raw.sides);
        const numericResult = Number(raw.result) || 1;
        return {
          id: raw.id || `${sides}-${numericResult}-${index}`,
          sides,
          result: Math.max(1, Math.min(sides, numericResult)),
          dropped: Boolean(raw.dropped),
          exploded: Boolean(raw.exploded),
          index,
        };
      })
    : [];

  if (dice.length) return dice.slice(0, 12);

  const fallback = Number(fallbackResult) || 1;
  return [{ id: 'fallback-d20', sides: 20, result: Math.max(1, Math.min(20, fallback)), dropped: false, exploded: false, index: 0 }];
}

function dieLabel(sides) {
  return sides === 100 ? 'd%' : `d${sides}`;
}

function DieShape({ die, isPrimary = false }) {
  return (
    <div
      className={`rq-cinematic-die-card ${die.dropped ? 'is-dropped' : ''} ${die.exploded ? 'is-exploded' : ''}`}
      style={{ '--rq-die-index': die.index }}
      data-testid={isPrimary ? 'cinematic-primary-die' : undefined}
    >
      <div className="rq-cinematic-die-shadow" />
      <div
        className={`rq-cinematic-die rq-cinematic-die--d${die.sides}`}
        data-testid={die.sides === 20 ? 'cinematic-d20' : `cinematic-d${die.sides}`}
      >
        <span className="rq-cinematic-die__facet rq-cinematic-die__facet--one" />
        <span className="rq-cinematic-die__facet rq-cinematic-die__facet--two" />
        <span className="rq-cinematic-die__facet rq-cinematic-die__facet--three" />
        <span className="rq-cinematic-die__ridge rq-cinematic-die__ridge--a" />
        <span className="rq-cinematic-die__ridge rq-cinematic-die__ridge--b" />
        <small>{dieLabel(die.sides)}</small>
        <strong data-testid={isPrimary ? 'cinematic-dice-number' : undefined}>{die.result}</strong>
      </div>
    </div>
  );
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
  rolls = [],
  rollMode = DICE_ROLLER_MODES.THREE_D,
  onRevealNow,
  onClose,
}) {
  const safeRollMode = normaliseDiceRollerMode(rollMode);
  const outcomeClass = isCrit ? 'is-critical' : isFumble ? 'is-fumble' : '';
  const displayTotal = clampResult(total);
  const outcomeLabel = getOutcomeLabel(isCrit, isFumble, isRevealed);
  const displayDice = buildDisplayDice(rolls, result);

  return (
    <div
      className={`rq-cinematic-roll ${isRevealed ? 'is-revealed' : 'is-rolling'} ${outcomeClass} is-mode-${safeRollMode} has-${displayDice.length}-dice`}
      data-testid="cinematic-dice-overlay"
      data-roll-mode={safeRollMode}
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

        <div className="rq-cinematic-roll__dice-line" aria-hidden="true" data-testid="cinematic-dice-formation" data-dice-count={displayDice.length} style={{ '--rq-dice-count': displayDice.length }}>
          {displayDice.map((die, index) => <DieShape key={die.id} die={{ ...die, index }} isPrimary={index === 0} />)}
        </div>

        <div className="rq-cinematic-roll__burst" />
      </div>

      <section className="rq-cinematic-roll__panel" aria-live="polite" aria-atomic="true" data-testid="cinematic-dice-panel">
        <div className="rq-cinematic-roll__status" data-testid="cinematic-dice-status"><Sparkles size={15} /> {outcomeLabel}</div>
        <h3 id="cinematic-dice-title" title={label || 'Dice roll'}>{label || 'Dice roll'}</h3>
        <p id="cinematic-dice-description" title={rollDetail}>{isRevealed ? rollDetail : `A ${safeRollMode === DICE_ROLLER_MODES.TWO_D ? '2D Lite' : '3D Cinematic'} dice formation is rolling${diceCount > 1 ? ` ${diceCount} dice` : ''}.`}</p>
        <div className="rq-cinematic-roll__actions">
          {!isRevealed && (
            <button type="button" onClick={onRevealNow} className="rq-cinematic-roll__reveal-now" data-testid="cinematic-dice-reveal-now" autoFocus>
              <Zap size={13} /> Reveal now
            </button>
          )}
          <span>Esc closes · Enter/Space reveals</span>
        </div>
        <div className="rq-cinematic-roll__total" data-testid="cinematic-dice-total" aria-label={isRevealed ? `Total ${displayTotal}` : 'Rolling'}>
          <span>{isRevealed ? 'Total' : safeRollMode === DICE_ROLLER_MODES.TWO_D ? '2D Roll' : '3D Roll'}</span>
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
