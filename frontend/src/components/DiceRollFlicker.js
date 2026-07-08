import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';
import './DiceRollFlicker.css';

const characterCache = new Map();

const palette = {
  player: {
    className: 'rq-dice-flicker--player',
    accent: 'var(--rq-accent-primary, #D6A84F)',
    accentHover: 'var(--rq-accent-hover, #F0CF75)',
    magic: 'var(--rq-accent-magic, #59C8FF)',
    success: 'var(--rq-success, #2DD4BF)',
    danger: 'var(--rq-danger, #E25A54)',
  },
  gm: {
    className: 'rq-dice-flicker--gm',
    accent: 'var(--rq-accent-primary, #D6A84F)',
    accentHover: 'var(--rq-accent-hover, #F0CF75)',
    magic: 'var(--rq-accent-active, #6E78FF)',
    success: 'var(--rq-success, #2DD4BF)',
    danger: 'var(--rq-danger, #E25A54)',
  },
};

const FLICKER_INTERVAL = 46;
const BASE_ROLL_DURATION = 960;
const REVEAL_GAP = 135;
const HOLD_AFTER_TOTAL = 2800;
const CUBE_FACE_LABELS = ['front', 'right', 'top', 'left', 'bottom', 'back'];

const formatModifier = (modifier) => {
  const value = Number(modifier) || 0;
  if (value === 0) return '';
  return value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
};

const clampSides = (value) => Math.max(2, Math.min(100, Math.floor(Number(value) || 20)));

function normalizeDice(rolls, fallbackTotal) {
  const dice = Array.isArray(rolls)
    ? rolls
      .filter(roll => roll && Number.isFinite(Number(typeof roll === 'object' ? roll.result : roll)))
      .map((roll, index) => {
        const raw = typeof roll === 'object' ? roll : { result: roll };
        const sides = clampSides(raw.sides);
        return {
          id: raw.id || `${raw.exploded ? 'x' : 'd'}-${sides}-${index}`,
          sides,
          result: Math.max(1, Math.min(sides, Number(raw.result) || 1)),
          dropped: Boolean(raw.dropped),
          exploded: Boolean(raw.exploded),
          originalIndex: index,
        };
      })
    : [];

  if (dice.length) return dice;

  const result = Math.max(1, Number(fallbackTotal) || 1);
  return [{ id: 'fallback', sides: Math.max(20, result), result, dropped: false, exploded: false, originalIndex: 0 }];
}

function randomFace(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function getPanelValue(baseValue, sides, panelIndex) {
  if (panelIndex === 0) return baseValue;
  return ((Number(baseValue) + panelIndex * 3 - 1) % sides) + 1;
}

function getFinalRotation(die, index) {
  const seed = Number(die.result || 1) + Number(die.sides || 20) + index * 7;
  return {
    '--rq-die-final-x': `${-18 + (seed % 7)}deg`,
    '--rq-die-final-y': `${16 + (seed % 9)}deg`,
    '--rq-die-final-z': `${-6 + (seed % 5) * 3}deg`,
    '--rq-die-roll-delay': `${Math.min(index * 42, 260)}ms`,
  };
}

function getDieShapeClass(sides) {
  if (sides === 6) return 'is-cube-die';
  if (sides === 20) return 'is-hero-d20';
  if (sides >= 10) return 'is-poly-die';
  return 'is-small-poly-die';
}

function getCharacterIdFromPath() {
  if (typeof window === 'undefined') return '';
  const match = window.location.pathname.match(/\/characters\/([^/]+)/i);
  return match?.[1] || '';
}

async function getCharacterForRoll(characterId) {
  if (!characterId) return null;
  if (characterCache.has(characterId)) return characterCache.get(characterId);
  try {
    const response = await apiClient.get(`/characters/${characterId}`);
    characterCache.set(characterId, response.data);
    return response.data;
  } catch {
    return null;
  }
}

export default function DiceRollFlicker({
  isOpen,
  show,
  onClose,
  onComplete,
  rolls = [],
  label,
  modifier = 0,
  total = 0,
  animationValue,
  isCrit = false,
  isFumble = false,
  theme = 'player',
}) {
  const colors = palette[theme] || palette.player;
  const visible = Boolean(isOpen ?? show);
  const onCloseRef = useRef(onClose || onComplete);
  const recordedKeyRef = useRef('');
  const revealedRef = useRef([]);
  const numericTotal = Number(total);
  const numericAnimationValue = Number(animationValue);
  const finalTotal = Number.isFinite(numericTotal) ? numericTotal : Number.isFinite(numericAnimationValue) ? numericAnimationValue : 0;
  const naturalFocus = Number.isFinite(numericAnimationValue) && numericAnimationValue !== finalTotal ? numericAnimationValue : null;
  const dice = useMemo(() => normalizeDice(rolls, finalTotal), [rolls, finalTotal]);
  const [displayValues, setDisplayValues] = useState(() => dice.map((die) => randomFace(die.sides)));
  const [revealed, setRevealed] = useState(() => dice.map(() => false));
  const [showTotal, setShowTotal] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => { onCloseRef.current = onClose || onComplete; }, [onClose, onComplete]);

  const keptDice = useMemo(() => {
    const kept = dice.filter(die => !die.dropped);
    return kept.length ? kept : dice;
  }, [dice]);

  const rollDetail = useMemo(() => {
    const base = dice.map((die) => {
      const prefix = die.exploded ? '↳ ' : '';
      const suffix = die.dropped ? ' dropped' : die.exploded ? ' exploding' : '';
      return `${prefix}d${die.sides}: ${die.result}${suffix}`;
    }).join(' • ');
    return `${base}${formatModifier(modifier)}`;
  }, [modifier, dice]);

  const diceSubtotal = useMemo(() => keptDice.reduce((sum, die) => sum + Number(die.result || 0), 0), [keptDice]);
  const natural20 = useMemo(() => keptDice.some(die => die.sides === 20 && die.result === 20), [keptDice]);
  const natural1 = useMemo(() => keptDice.some(die => die.sides === 20 && die.result === 1), [keptDice]);
  const finalCrit = Boolean(isCrit || natural20);
  const finalFumble = Boolean(!finalCrit && (isFumble || natural1));

  useEffect(() => {
    if (!visible || theme !== 'player') return undefined;
    const characterId = getCharacterIdFromPath();
    if (!characterId) return undefined;
    const rollKey = `${characterId}-${label}-${finalTotal}-${modifier}-${JSON.stringify(rolls)}`;
    if (recordedKeyRef.current === rollKey) return undefined;
    recordedKeyRef.current = rollKey;

    let cancelled = false;
    getCharacterForRoll(characterId).then(character => {
      if (cancelled || !character) return;
      const campaignId = character.campaign_id || character.campaignId || character.campaign?.id || character.current_campaign_id || '';
      if (!campaignId) return;
      const characterName = character.name || character.character_name || 'Player Character';
      recordRemoteRoll(campaignId, {
        actor: characterName,
        actor_type: 'player',
        character_id: character.id || characterId,
        character_name: characterName,
        label: label || 'Player Roll',
        notation: label || '',
        total: finalTotal,
        modifier,
        rolls,
        visibleRolls: rolls.filter?.(roll => !roll?.dropped) || rolls,
        isCrit: finalCrit,
        isFumble: finalFumble,
        explosionCount: rolls.filter?.(roll => roll?.exploded).length || 0,
      });
    });
    return () => { cancelled = true; };
  }, [visible, theme, label, finalTotal, modifier, rolls, finalCrit, finalFumble]);

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return undefined;

    const timers = [];
    const initialRevealState = dice.map(() => false);
    const rollDuration = Math.min(1700, BASE_ROLL_DURATION + dice.length * 85);
    const revealGap = dice.length > 5 ? 82 : REVEAL_GAP;
    const finalRevealTime = rollDuration + revealGap * Math.max(0, dice.length - 1);
    const totalRevealTime = finalRevealTime + 210;

    revealedRef.current = initialRevealState;
    setDisplayValues(dice.map((die) => randomFace(die.sides)));
    setRevealed(initialRevealState);
    setShowTotal(false);
    setFading(false);

    const flickerId = window.setInterval(() => {
      const currentRevealed = revealedRef.current;
      setDisplayValues((current) => current.map((value, index) => (
        currentRevealed[index] ? value : randomFace(dice[index]?.sides || 20)
      )));
    }, FLICKER_INTERVAL);

    dice.forEach((die, dieIndex) => {
      timers.push(window.setTimeout(() => {
        revealedRef.current = revealedRef.current.map((item, index) => index === dieIndex ? true : item);
        setRevealed(revealedRef.current);
        setDisplayValues((prev) => prev.map((value, index) => index === dieIndex ? die.result : value));
      }, rollDuration + revealGap * dieIndex));
    });

    timers.push(window.setTimeout(() => setShowTotal(true), totalRevealTime));
    timers.push(window.setTimeout(() => setFading(true), totalRevealTime + HOLD_AFTER_TOTAL - 360));
    timers.push(window.setTimeout(() => { onCloseRef.current?.(); }, totalRevealTime + HOLD_AFTER_TOTAL));

    return () => {
      window.clearInterval(flickerId);
      timers.forEach(id => window.clearTimeout(id));
    };
  }, [visible, dice]);

  if (!visible || typeof document === 'undefined') return null;

  const outcomeClass = showTotal && finalCrit ? 'is-critical' : showTotal && finalFumble ? 'is-fumble' : showTotal ? 'is-complete' : 'is-rolling';
  const status = showTotal ? (finalCrit ? 'Critical success' : finalFumble ? 'Critical fail' : 'Roll complete') : 'Rolling 3D dice';
  const formulaText = `${diceSubtotal}${formatModifier(modifier)} = ${finalTotal}`;
  const closeNow = () => {
    setFading(true);
    window.setTimeout(() => onCloseRef.current?.(), 90);
  };

  return createPortal(
    <div
      className={`rq-dice-flicker ${colors.className} ${outcomeClass} ${fading ? 'is-fading' : ''}`}
      role="status"
      aria-live="polite"
      style={{
        '--rq-roll-accent': colors.accent,
        '--rq-roll-accent-hover': colors.accentHover,
        '--rq-roll-magic': colors.magic,
        '--rq-roll-success': colors.success,
        '--rq-roll-danger': colors.danger,
      }}
    >
      <div className="rq-dice-flicker__card">
        <div className="rq-dice-flicker__glow" />
        <div className="rq-dice-flicker__dice" aria-label="Dice results">
          {dice.map((die, index) => {
            const isRevealed = Boolean(revealed[index]);
            const faceValue = displayValues[index] ?? die.result;
            const isNat1 = !die.dropped && die.sides === 20 && die.result === 1;
            const isNat20 = !die.dropped && die.sides === 20 && die.result === 20;
            const dieClass = [
              'rq-die',
              getDieShapeClass(die.sides),
              isRevealed ? 'is-revealed' : 'is-tumbling',
              die.dropped ? 'is-dropped' : '',
              die.exploded ? 'is-exploded' : '',
              isNat20 ? 'is-natural-20' : '',
              isNat1 ? 'is-natural-1' : '',
            ].filter(Boolean).join(' ');
            return (
              <div key={die.id} className={dieClass} style={getFinalRotation(die, index)}>
                <div className="rq-die__stage" aria-label={`d${die.sides} result ${isRevealed ? die.result : faceValue}`}>
                  <div className="rq-die__shadow" />
                  <div className="rq-die__face">
                    {CUBE_FACE_LABELS.map((faceName, faceIndex) => (
                      <span key={faceName} className={`rq-die__panel rq-die__panel--${faceName}`}>
                        {getPanelValue(faceValue, die.sides, faceIndex)}
                      </span>
                    ))}
                  </div>
                </div>
                <small>{die.exploded ? 'EX' : die.dropped ? 'DROP' : `d${die.sides}`}</small>
              </div>
            );
          })}
        </div>

        <div className="rq-dice-flicker__summary">
          <div className="rq-dice-flicker__status"><Sparkles size={14} /> {status}</div>
          <div className="rq-dice-flicker__title" title={label || 'Dice roll'}>{label || 'Dice roll'}</div>
          <div className="rq-dice-flicker__detail" title={rollDetail}>{showTotal ? rollDetail : `${dice.length} ${dice.length === 1 ? 'die' : 'dice'} tumbling`}</div>
        </div>

        <div className="rq-dice-flicker__total" aria-label={`Total ${finalTotal}`}>
          <span>{showTotal ? 'Total' : 'Rolling'}</span>
          <strong>{showTotal ? finalTotal : '—'}</strong>
          {showTotal && <em>{formulaText}</em>}
          {showTotal && naturalFocus !== null && <small>Natural d20: {naturalFocus}</small>}
        </div>

        <button type="button" className="rq-dice-flicker__close" onClick={closeNow} aria-label="Dismiss roll result">
          <X size={15} />
        </button>
      </div>
    </div>,
    document.body
  );
}
