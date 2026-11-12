import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';
import FlatDiceResultOverlay from '@/components/FlatDiceResultOverlay';
import { currentCharacterId } from '@/lib/characterRoute';

const characterCache = new Map();
const REVEAL_DELAY = 360;
// With the 3D tray the dice decide when the roll is over: the tray calls
// onRevealNow the moment they stop. The 360ms used for the flat card would
// put the total on screen while they were still in the air, and the
// auto-close that follows it could shut the panel as they landed. This is
// only a backstop for a throw that somehow never reports settling.
// The longest replay is MAX_STEPS at TIME_SCALE (dice3d/diceTrayScene.js
// longestReplayMs, 12.5 s) plus the pause before the total: wait for that.
const TRAY_REVEAL_CEILING = 13500;
const REDUCED_MOTION_REVEAL_DELAY = 90;
const HOLD_AFTER_REVEAL = 6000;

const formatModifier = (modifier) => {
  const value = Number(modifier) || 0;
  if (value === 0) return '';
  return value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
};

const clampSides = (value) => Math.max(2, Math.min(100, Math.floor(Number(value) || 20)));

function normalizeDice(rolls, fallbackTotal) {
  const dice = Array.isArray(rolls)
    ? rolls
      .filter((roll) => roll && Number.isFinite(Number(typeof roll === 'object' ? roll.result : roll)))
      .map((roll, index) => {
        const raw = typeof roll === 'object' ? roll : { result: roll };
        const sides = clampSides(raw.sides);
        const result = Math.max(1, Math.min(sides, Number(raw.result) || 1));
        const sign = Number(raw.sign) < 0 || Number(raw.contribution) < 0 ? -1 : 1;
        return {
          id: raw.id || `${raw.exploded ? 'x' : 'd'}-${sides}-${index}`,
          sides,
          result,
          sign,
          contribution: raw.dropped ? 0 : Number.isFinite(Number(raw.contribution)) ? Number(raw.contribution) : sign * result,
          dropped: Boolean(raw.dropped),
          exploded: Boolean(raw.exploded),
          originalIndex: index,
        };
      })
    : [];

  if (dice.length) return dice;

  const result = Math.max(1, Number(fallbackTotal) || 1);
  return [{ id: 'fallback', sides: Math.max(20, result), result, sign: 1, contribution: result, dropped: false, exploded: false, originalIndex: 0 }];
}

const getCharacterIdFromPath = currentCharacterId;

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
  rollId,
  dyeId,
  isCrit = false,
  isFumble = false,
  theme = 'player',
  // 'hex' puts the 3D throw in a hexagon over the wheel matching anchorSelector.
  shape,
  anchorSelector,
  // Replaces the "dice + modifier = total" line under the result, for a
  // throw that is ceremony rather than arithmetic (the level-up reveal).
  resultCaption,
}) {
  const visible = Boolean(isOpen ?? show);
  const onCloseRef = useRef(onClose || onComplete);
  const recordedKeyRef = useRef('');
  const numericTotal = Number(total);
  const numericAnimationValue = Number(animationValue);
  const finalTotal = Number.isFinite(numericTotal)
    ? numericTotal
    : Number.isFinite(numericAnimationValue)
      ? numericAnimationValue
      : 0;
  // Flat damage is a deterministic amount (for example 1 + STR), not a
  // one-sided die. Never turn its d1 storage representation into a fake d2.
  const isFixedDamage = Array.isArray(rolls) && rolls.length > 0
    && rolls.every(roll => roll && typeof roll === 'object' && Number(roll.sides) === 1);
  const fixedBase = isFixedDamage
    ? rolls.reduce((sum, roll) => sum + (Number(roll?.result) || 0), 0)
    : 0;
  const dice = useMemo(
    () => isFixedDamage ? [] : normalizeDice(rolls, finalTotal),
    [rolls, finalTotal, isFixedDamage],
  );
  // Sheet rerenders rebuild the rolls array. A stable fingerprint stops
  // unrelated state changes from cancelling an in-flight character roll.
  const diceFingerprint = dice.map((die) => [
    die.sides, die.result, die.sign, die.dropped ? 1 : 0, die.exploded ? 1 : 0,
  ].join(':')).join('|');
  const hasRawDice = Array.isArray(rolls) && rolls.length > 0;
  // Build the remote event from exactly the same displayed die faces, not
  // from the original numeric arrays. Only primitive fingerprint changes
  // invalidate it; the event cannot be cancelled by a fresh array reference.
  const reportableDice = useMemo(() => {
    if (isFixedDamage || !hasRawDice) return [];
    return diceFingerprint.split('|').map(fingerprint => {
      const [sides, result, sign, dropped, exploded] = fingerprint.split(':');
      return {
        sides: Number(sides), result: Number(result), sign: Number(sign),
        dropped: dropped === '1', exploded: exploded === '1',
      };
    });
  }, [diceFingerprint, isFixedDamage, hasRawDice]);
  const [showTotal, setShowTotal] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);

  // three.js and cannon-es are a large chunk, so they are only fetched once
  // a roll is actually shown, and never for a viewer on reduced motion.
  // A failed fetch is not an error worth surfacing mid-turn: the flat
  // overlay already shows the same result, so the roll simply stays flat.
  const [TrayOverlay, setTrayOverlay] = useState(null);
  useEffect(() => {
    if (prefersReducedMotion || !visible || TrayOverlay || isFixedDamage) return undefined;

    let cancelled = false;
    import('@/components/DiceTray3DOverlay')
      .then((module) => { if (!cancelled) setTrayOverlay(() => module.default); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [prefersReducedMotion, visible, TrayOverlay, isFixedDamage]);

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
    const kept = dice.filter((die) => !die.dropped);
    return kept.length ? kept : dice;
  }, [dice]);

  const rollDetail = useMemo(() => {
    if (isFixedDamage) return `Fixed damage: ${fixedBase}${formatModifier(modifier)}`;
    const base = dice.map((die) => {
      const chainPrefix = die.exploded ? '↳ ' : '';
      const signPrefix = die.sign < 0 ? '−' : '';
      const suffix = die.dropped ? ' dropped' : die.exploded ? ' exploding' : '';
      return `${chainPrefix}${signPrefix}d${die.sides}: ${die.result}${suffix}`;
    }).join(' • ');
    return `${base}${formatModifier(modifier)}`;
  }, [modifier, dice, isFixedDamage, fixedBase]);

  const diceSubtotal = useMemo(
    () => keptDice.reduce((sum, die) => sum + Number(die.contribution ?? ((die.sign || 1) * Number(die.result || 0))), 0),
    [keptDice],
  );
  const keptPositiveD20s = useMemo(() => keptDice.filter((die) => die.sides === 20 && die.sign > 0), [keptDice]);
  const natural20 = keptPositiveD20s.length === 1 && keptPositiveD20s[0].result === 20;
  const natural1 = keptPositiveD20s.length === 1 && keptPositiveD20s[0].result === 1;
  const finalCrit = Boolean(isCrit || natural20);
  const finalFumble = Boolean(!finalCrit && (isFumble || natural1));

  useEffect(() => {
    if (!visible || theme !== 'player') return undefined;
    const characterId = getCharacterIdFromPath();
    if (!characterId) return undefined;
    const rollKey = rollId ? `${characterId}-${rollId}` : `${characterId}-${label}-${finalTotal}-${modifier}-${diceFingerprint}`;
    if (recordedKeyRef.current === rollKey) return undefined;
    recordedKeyRef.current = rollKey;

    let cancelled = false;
    getCharacterForRoll(characterId).then((character) => {
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
        notation: isFixedDamage ? 'Fixed damage' : label || '',
        total: finalTotal,
        modifier,
        rolls: reportableDice,
        visibleRolls: reportableDice.filter(die => !die.dropped),
        isCrit: finalCrit,
        isFumble: finalFumble,
        explosionCount: reportableDice.filter(die => die.exploded).length,
      });
    });
    return () => { cancelled = true; };
  }, [visible, theme, label, finalTotal, modifier, reportableDice, isFixedDamage, finalCrit, finalFumble, rollId, diceFingerprint]);

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return undefined;
    // Fixed damage has no dice to animate: reveal the result immediately.
    setShowTotal(isFixedDamage);
    if (isFixedDamage) return undefined;
    const usingTray = !prefersReducedMotion && Boolean(TrayOverlay);
    const delay = prefersReducedMotion
      ? REDUCED_MOTION_REVEAL_DELAY
      : usingTray ? TRAY_REVEAL_CEILING : REVEAL_DELAY;

    const revealTimer = window.setTimeout(() => setShowTotal(true), delay);
    return () => window.clearTimeout(revealTimer);
  }, [visible, diceFingerprint, finalTotal, prefersReducedMotion, TrayOverlay, rollId, isFixedDamage]);

  useEffect(() => {
    if (!visible || !showTotal || typeof window === 'undefined') return undefined;
    const closeTimer = window.setTimeout(() => { onCloseRef.current?.(); }, HOLD_AFTER_REVEAL);
    return () => window.clearTimeout(closeTimer);
  }, [visible, showTotal, finalTotal, rollId]);

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
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

  const formulaText = resultCaption || (isFixedDamage
    ? `Fixed damage: ${fixedBase}${formatModifier(modifier)} = ${finalTotal}`
    : `${diceSubtotal}${formatModifier(modifier)} = ${finalTotal}`);

  // Physical tumbling dice by default; the flat overlay stays the
  // presentation for viewers who ask for reduced motion
  // (docs/UI_DESIGN_SYSTEM.md requires honouring prefers-reduced-motion),
  // and remains the fallback until the 3D chunk has loaded, or for good if
  // it cannot load. Both take the same props.
  const Overlay = (!isFixedDamage && !prefersReducedMotion && TrayOverlay) || FlatDiceResultOverlay;

  return createPortal(
    <Overlay
      rollId={rollId}
      dyeId={dyeId}
      total={finalTotal}
      label={label}
      rollDetail={rollDetail}
      formulaText={formulaText}
      rolls={dice}
      isRevealed={showTotal}
      isCrit={finalCrit}
      isFumble={finalFumble}
      isFixedDamage={isFixedDamage}
      onRevealNow={() => setShowTotal(true)}
      onClose={() => onCloseRef.current?.()}
      shape={shape}
      anchorSelector={anchorSelector}
    />,
    document.body,
  );
}
