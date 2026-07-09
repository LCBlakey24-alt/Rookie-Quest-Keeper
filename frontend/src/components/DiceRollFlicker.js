import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';
import CinematicDiceOverlay from '@/components/CinematicDiceOverlay';
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

const CINEMATIC_REVEAL_DELAY = 2300;
const REDUCED_MOTION_REVEAL_DELAY = 90;
const HOLD_AFTER_REVEAL = 3100;

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

function getCharacterIdFromPath() {
  if (typeof window === 'undefined') return '';
  const match = window.location.pathname.match(/\/characters\/([^/]+)/i);
  return match?.[1] || '';
}

function getPrefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const numericTotal = Number(total);
  const numericAnimationValue = Number(animationValue);
  const finalTotal = Number.isFinite(numericTotal) ? numericTotal : Number.isFinite(numericAnimationValue) ? numericAnimationValue : 0;
  const naturalFocus = Number.isFinite(numericAnimationValue) && numericAnimationValue !== finalTotal ? numericAnimationValue : null;
  const dice = useMemo(() => normalizeDice(rolls, finalTotal), [rolls, finalTotal]);
  const [showTotal, setShowTotal] = useState(false);
  const [fading, setFading] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);

  useEffect(() => { onCloseRef.current = onClose || onComplete; }, [onClose, onComplete]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener?.('change', updatePreference);
    return () => mediaQuery.removeEventListener?.('change', updatePreference);
  }, []);

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
  const cinematicResult = naturalFocus ?? finalTotal;

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

    setShowTotal(false);
    setFading(false);

    const revealDelay = prefersReducedMotion ? REDUCED_MOTION_REVEAL_DELAY : CINEMATIC_REVEAL_DELAY;
    const revealTimer = window.setTimeout(() => setShowTotal(true), revealDelay);

    return () => window.clearTimeout(revealTimer);
  }, [visible, dice, finalTotal, prefersReducedMotion]);

  useEffect(() => {
    if (!visible || !showTotal || typeof window === 'undefined') return undefined;

    const fadeTimer = window.setTimeout(() => setFading(true), HOLD_AFTER_REVEAL - 360);
    const closeTimer = window.setTimeout(() => { onCloseRef.current?.(); }, HOLD_AFTER_REVEAL);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(closeTimer);
    };
  }, [visible, showTotal, finalTotal]);

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setFading(true);
        window.setTimeout(() => onCloseRef.current?.(), 90);
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setShowTotal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  if (!visible || typeof document === 'undefined') return null;

  const outcomeClass = showTotal && finalCrit ? 'is-critical' : showTotal && finalFumble ? 'is-fumble' : showTotal ? 'is-complete' : 'is-rolling';
  const formulaText = `${diceSubtotal}${formatModifier(modifier)} = ${finalTotal}`;
  const closeNow = () => {
    setFading(true);
    window.setTimeout(() => onCloseRef.current?.(), 90);
  };

  return createPortal(
    <div
      className={`rq-dice-flicker rq-dice-flicker--cinematic ${colors.className} ${outcomeClass} ${fading ? 'is-fading' : ''}`}
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
      <CinematicDiceOverlay
        result={cinematicResult}
        total={finalTotal}
        label={label}
        rollDetail={rollDetail}
        formulaText={formulaText}
        isRevealed={showTotal}
        isCrit={finalCrit}
        isFumble={finalFumble}
        diceCount={dice.length}
        onRevealNow={() => setShowTotal(true)}
        onClose={closeNow}
      />
    </div>,
    document.body
  );
}
