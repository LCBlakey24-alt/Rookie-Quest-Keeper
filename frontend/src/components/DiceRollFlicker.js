import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';

const characterCache = new Map();

const palette = {
  player: { bg: 'rgba(36,36,36,0.97)', panel: '#2f2f2f', card: '#3a3a3a', accent: '#d00000', text: '#ffffff', muted: 'rgba(255,255,255,0.68)', line: 'rgba(255,255,255,0.16)' },
  gm: { bg: 'rgba(36,36,36,0.97)', panel: '#2f2f2f', card: '#3a3a3a', accent: '#d00000', text: '#ffffff', muted: 'rgba(255,255,255,0.68)', line: 'rgba(255,255,255,0.16)' },
};

const FLICKER_DURATION = 3500;
const REVEAL_GAP = 500;
const FLICKER_INTERVAL = 70;
const HOLD_AFTER_TOTAL = 5200;

const formatModifier = (modifier) => {
  const value = Number(modifier) || 0;
  if (value === 0) return '';
  return value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
};

const clampSides = (value) => Math.max(2, Math.min(100, Math.floor(Number(value) || 20)));

function normalizeDice(rolls, fallbackTotal) {
  const dice = Array.isArray(rolls)
    ? rolls
      .filter(roll => roll && Number.isFinite(Number(roll.result)))
      .map((roll, index) => {
        const sides = clampSides(roll.sides);
        return {
          id: `${roll.exploded ? 'x' : 'd'}-${index}`,
          sides,
          result: Math.max(1, Math.min(sides, Number(roll.result) || 1)),
          exploded: Boolean(roll.exploded),
          originalIndex: index,
        };
      })
    : [];

  if (dice.length) {
    return [...dice].sort((a, b) => a.sides - b.sides || a.originalIndex - b.originalIndex);
  }

  const result = Math.max(1, Number(fallbackTotal) || 1);
  return [{ id: 'fallback', sides: Math.max(20, result), result, exploded: false, originalIndex: 0 }];
}

function randomFace(sides) {
  return Math.floor(Math.random() * sides) + 1;
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

export default function DiceRollFlicker({ isOpen, show, onClose, onComplete, rolls = [], label, modifier = 0, total = 0, animationValue, isCrit = false, isFumble = false, theme = 'player' }) {
  const colors = palette[theme] || palette.player;
  const visible = Boolean(isOpen ?? show);
  const onCloseRef = useRef(onClose || onComplete);
  const recordedKeyRef = useRef('');
  const revealedRef = useRef([]);
  const finalDisplayValue = Number(animationValue ?? total) || 0;
  const dice = useMemo(() => normalizeDice(rolls, finalDisplayValue), [rolls, finalDisplayValue]);
  const [displayValues, setDisplayValues] = useState(() => dice.map((die) => randomFace(die.sides)));
  const [revealed, setRevealed] = useState(() => dice.map(() => false));
  const [showTotal, setShowTotal] = useState(false);
  const [fading, setFading] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 640 : false));

  useEffect(() => { onCloseRef.current = onClose || onComplete; }, [onClose, onComplete]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateViewport = () => setIsMobileViewport(window.innerWidth <= 640);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const rollDetail = useMemo(() => {
    const base = dice.map((roll) => `${roll.exploded ? '↳ ' : ''}d${roll.sides}: ${roll.result}`).join(' + ');
    const explosionText = dice.some((roll) => roll.exploded) ? ' • exploding dice' : '';
    return `${base}${formatModifier(modifier)}${explosionText}`;
  }, [modifier, dice]);

  const diceSubtotal = useMemo(() => dice.reduce((sum, die) => sum + Number(die.result || 0), 0), [dice]);
  const natural20 = useMemo(() => dice.some(die => die.sides === 20 && die.result === 20), [dice]);
  const natural1 = useMemo(() => dice.some(die => die.sides === 20 && die.result === 1), [dice]);
  const finalCrit = Boolean(isCrit || natural20);
  const finalFumble = Boolean(isFumble || natural1);

  useEffect(() => {
    if (!visible || theme !== 'player') return undefined;
    const characterId = getCharacterIdFromPath();
    if (!characterId) return undefined;
    const rollKey = `${characterId}-${label}-${total}-${modifier}-${JSON.stringify(rolls)}`;
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
        total,
        modifier,
        rolls,
        visibleRolls: rolls,
        isCrit: finalCrit,
        isFumble: finalFumble,
        explosionCount: rolls.filter(roll => roll.exploded).length,
      });
    });
    return () => { cancelled = true; };
  }, [visible, theme, label, total, modifier, rolls, finalCrit, finalFumble]);

  useEffect(() => {
    if (!visible) return undefined;

    const timers = [];
    const finalRevealTime = FLICKER_DURATION + REVEAL_GAP * Math.max(0, dice.length - 1);
    const totalRevealTime = finalRevealTime + REVEAL_GAP;

    revealedRef.current = dice.map(() => false);
    setDisplayValues(dice.map((die) => randomFace(die.sides)));
    setRevealed(dice.map(() => false));
    setShowTotal(false);
    setFading(false);

    const flickerId = window.setInterval(() => {
      setDisplayValues((current) => current.map((value, index) => (
        revealedRef.current[index] ? dice[index]?.result ?? value : randomFace(dice[index]?.sides || 20)
      )));
    }, FLICKER_INTERVAL);

    dice.forEach((die, dieIndex) => {
      timers.push(window.setTimeout(() => {
        revealedRef.current = revealedRef.current.map((item, index) => index === dieIndex ? true : item);
        setRevealed((prev) => prev.map((item, index) => index === dieIndex ? true : item));
        setDisplayValues((prev) => prev.map((value, index) => index === dieIndex ? die.result : value));
      }, FLICKER_DURATION + REVEAL_GAP * dieIndex));
    });

    timers.push(window.setTimeout(() => setShowTotal(true), totalRevealTime));
    timers.push(window.setTimeout(() => setFading(true), totalRevealTime + HOLD_AFTER_TOTAL - 650));
    timers.push(window.setTimeout(() => { onCloseRef.current?.(); }, totalRevealTime + HOLD_AFTER_TOTAL));

    return () => {
      window.clearInterval(flickerId);
      timers.forEach(id => window.clearTimeout(id));
    };
  }, [visible, dice]);

  if (!visible) return null;

  const settled = showTotal;
  const statusColor = settled && finalFumble ? colors.accent : colors.text;
  const status = settled ? (finalCrit ? 'Natural 20' : finalFumble ? 'Natural 1' : label || 'Result') : 'Rolling…';
  const shellPosition = { left: '50%', bottom: isMobileViewport ? '104px' : '34px', transform: 'translateX(-50%)' };
  const wheelHeight = isMobileViewport ? 58 : 52;
  const wheelWidth = isMobileViewport ? 56 : 50;
  const fontSize = isMobileViewport ? 34 : 30;
  const resultFontSize = showTotal ? (isMobileViewport ? 38 : 34) : 14;
  const outcomeLabel = finalCrit ? 'Critical success' : finalFumble ? 'Critical fail' : 'Roll complete';

  const closeNow = () => {
    setFading(true);
    window.setTimeout(() => onCloseRef.current?.(), 80);
  };

  return createPortal(
    <div aria-live="polite" style={{ position: 'fixed', ...shellPosition, zIndex: 3000, pointerEvents: 'auto', fontFamily: 'var(--rq-body-font, Manrope, Inter, sans-serif)', opacity: fading ? 0 : 1, transition: 'opacity 650ms ease' }}>
      <div style={{ width: 'max-content', maxWidth: 'calc(100vw - 24px)', padding: isMobileViewport ? '10px 12px 9px' : '9px 11px', borderRadius: 0, background: colors.bg, color: colors.text, display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: isMobileViewport ? 12 : 10, textAlign: 'left', borderLeft: `5px solid ${settled && (finalCrit || finalFumble) ? colors.accent : colors.line}`, boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dice.length > 1 ? 6 : 8, flexWrap: dice.length > 3 ? 'wrap' : 'nowrap', maxWidth: isMobileViewport ? 210 : 260 }}>
          {dice.map((die, index) => {
            const isRevealed = Boolean(revealed[index]);
            const isNat1 = die.sides === 20 && die.result === 1;
            const isNat20 = die.sides === 20 && die.result === 20;
            const dieColor = isRevealed && (isNat1 || isNat20) ? colors.accent : colors.text;
            return (
              <div key={die.id} style={{ display: 'grid', gap: 3, justifyItems: 'center' }}>
                <div style={{ width: wheelWidth, height: wheelHeight, overflow: 'hidden', background: colors.card, display: 'grid', placeItems: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 3, background: isRevealed ? colors.accent : 'transparent', opacity: isRevealed ? 0.9 : 0 }} />
                  <div style={{ color: dieColor, fontSize, lineHeight: 1, fontWeight: 950, fontVariantNumeric: 'tabular-nums', transition: isRevealed ? 'color 180ms ease, transform 180ms ease' : 'none', transform: isRevealed ? 'scale(1.08)' : 'scale(1)' }}>
                    {displayValues[index] ?? die.result}
                  </div>
                </div>
                <div style={{ color: colors.muted, fontSize: isMobileViewport ? 10 : 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{die.exploded ? 'ex' : `d${die.sides}`}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, minWidth: 0 }}>
            <span style={{ color: statusColor, fontSize: isMobileViewport ? 12 : 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{status}</span>
            <strong style={{ color: colors.text, fontSize: resultFontSize, lineHeight: 1, fontWeight: 950, fontVariantNumeric: 'tabular-nums', transition: 'font-size 220ms ease' }}>{showTotal ? finalDisplayValue : 'rolling'}</strong>
          </div>
          {showTotal && <div style={{ color: finalCrit || finalFumble ? colors.text : colors.muted, fontSize: isMobileViewport ? 10 : 9, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{outcomeLabel}</div>}
          <div style={{ color: colors.muted, fontSize: isMobileViewport ? 11 : 10, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobileViewport ? 240 : 280 }}>{showTotal ? (rollDetail || label) : `${dice.length} dice flickering`}</div>
          {showTotal && <div style={{ color: colors.muted, fontSize: isMobileViewport ? 11 : 10, fontWeight: 800 }}>Dice {diceSubtotal}{formatModifier(modifier)} = {finalDisplayValue}</div>}
        </div>

        <button type="button" onClick={closeNow} aria-label="Dismiss roll result" style={{ width: 30, height: 30, minWidth: 30, border: 0, borderRadius: 0, background: colors.card, color: colors.text, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
          <X size={15} />
        </button>
      </div>
    </div>,
    document.body
  );
}
