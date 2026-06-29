import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dices } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';

const characterCache = new Map();

const palette = {
  player: { bg: 'rgba(36,36,36,0.98)', panel: '#2f2f2f', card: '#3a3a3a', border: 'rgba(255,255,255,0.16)', accent: '#d00000', text: '#ffffff', muted: 'rgba(255,255,255,0.68)' },
  gm: { bg: 'rgba(36,36,36,0.98)', panel: '#2f2f2f', card: '#3a3a3a', border: 'rgba(255,255,255,0.16)', accent: '#d00000', text: '#ffffff', muted: 'rgba(255,255,255,0.68)' },
};

const CRIT_GREEN = '#22C55E';
const FUMBLE_RED = '#EF4444';
const WHEEL_EASE = 'cubic-bezier(0.08, 0.82, 0.12, 1)';

const formatModifier = (modifier) => {
  const value = Number(modifier) || 0;
  if (value === 0) return '';
  return value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
};

const clampSides = (value) => Math.max(2, Math.min(100, Math.floor(Number(value) || 20)));

function normalizeDice(rolls, fallbackTotal) {
  const dice = Array.isArray(rolls) ? rolls.filter(roll => roll && Number.isFinite(Number(roll.result))).map((roll, index) => {
    const sides = clampSides(roll.sides);
    return { id: `${roll.exploded ? 'x' : 'd'}-${index}`, sides, result: Math.max(1, Math.min(sides, Number(roll.result) || 1)), exploded: Boolean(roll.exploded) };
  }) : [];
  if (dice.length) return dice;
  const result = Math.max(1, Number(fallbackTotal) || 1);
  return [{ id: 'fallback', sides: Math.max(20, result), result, exploded: false }];
}

function wheelTargetStep(die, index) {
  const rounds = 5 + index;
  return rounds * die.sides + (die.result - 1);
}

function wheelNumbers(die, index) {
  const finalStep = wheelTargetStep(die, index);
  return Array.from({ length: finalStep + 1 }, (_, itemIndex) => (itemIndex % die.sides) + 1);
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
  const isHpLevelRoll = String(label || '').startsWith('HP d');
  const finalDisplayValue = Number(animationValue ?? total) || 0;
  const dice = useMemo(() => normalizeDice(rolls, finalDisplayValue), [rolls, finalDisplayValue]);
  const [wheelStarted, setWheelStarted] = useState(false);
  const [revealed, setRevealed] = useState(() => dice.map(() => true));
  const [showTotal, setShowTotal] = useState(true);
  const [settled, setSettled] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => { onCloseRef.current = onClose || onComplete; }, [onClose, onComplete]);

  const rollDetail = useMemo(() => {
    const base = dice.map((roll) => `${roll.exploded ? '↳ ' : ''}d${roll.sides}: ${roll.result}`).join(' + ');
    const explosionText = dice.some((roll) => roll.exploded) ? ' • exploding dice' : '';
    return `${base}${formatModifier(modifier)}${explosionText}`;
  }, [modifier, dice]);

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
      recordRemoteRoll(campaignId, { actor: characterName, actor_type: 'player', character_id: character.id || characterId, character_name: characterName, label: label || 'Player Roll', notation: label || '', total, modifier, rolls, visibleRolls: rolls, isCrit, isFumble, explosionCount: rolls.filter(roll => roll.exploded).length });
    });
    return () => { cancelled = true; };
  }, [visible, theme, label, total, modifier, rolls, isCrit, isFumble]);

  useEffect(() => {
    if (!visible) return undefined;
    const timers = [];
    const baseSpin = isHpLevelRoll ? 3200 : 2600;
    const revealGap = dice.length > 1 ? 520 : 0;
    const finalReveal = baseSpin + revealGap * Math.max(0, dice.length - 1);
    const holdDuration = isHpLevelRoll ? 4200 : 5000;

    setWheelStarted(false);
    setSettled(false);
    setShowTotal(false);
    setFading(false);
    setRevealed(dice.map(() => false));

    timers.push(window.setTimeout(() => setWheelStarted(true), 80));

    dice.forEach((die, dieIndex) => {
      timers.push(window.setTimeout(() => {
        setRevealed(prev => prev.map((item, index) => index === dieIndex ? true : item));
      }, baseSpin + revealGap * dieIndex));
    });

    timers.push(window.setTimeout(() => { setShowTotal(true); setSettled(true); }, finalReveal + 380));
    timers.push(window.setTimeout(() => setFading(true), finalReveal + holdDuration - 650));
    timers.push(window.setTimeout(() => { onCloseRef.current?.(); }, finalReveal + holdDuration));
    return () => { timers.forEach(id => window.clearTimeout(id)); };
  }, [visible, label, dice, isHpLevelRoll]);

  if (!visible) return null;

  const statusColor = settled && isCrit ? CRIT_GREEN : settled && isFumble ? FUMBLE_RED : colors.accent;
  const status = settled ? (isCrit ? 'Natural 20' : isFumble ? 'Natural 1' : label || 'Result') : (isHpLevelRoll ? 'Rolling hit points…' : 'Rolling…');
  const shellPosition = isHpLevelRoll ? { left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${settled ? 1 : 1.015})` } : { left: '50%', bottom: '58px', transform: `translateX(-50%) scale(${settled ? 1 : 1.01})` };
  const diceSubtotal = dice.reduce((sum, die) => sum + Number(die.result || 0), 0);
  const wheelHeight = isHpLevelRoll ? 104 : 88;
  const wheelWidth = isHpLevelRoll ? 96 : 82;
  const fontSize = isHpLevelRoll ? 62 : 52;

  return createPortal(
    <div aria-live="polite" style={{ position: 'fixed', ...shellPosition, zIndex: 3000, pointerEvents: 'none', fontFamily: 'var(--rq-body-font, Manrope, Inter, sans-serif)', opacity: fading ? 0 : 1, transition: 'opacity 650ms ease, transform 360ms ease' }}>
      <div style={{ minWidth: isHpLevelRoll ? 360 : 330, maxWidth: 'calc(100vw - 28px)', padding: isHpLevelRoll ? '24px 26px' : '16px 18px', borderRadius: 0, background: colors.bg, border: `1px solid ${settled && (isCrit || isFumble) ? statusColor : colors.border}`, boxShadow: `0 22px 70px rgba(0,0,0,0.52), ${settled && (isCrit || isFumble) ? `0 0 30px ${statusColor}55` : 'none'}`, display: 'grid', gap: 14, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, color: statusColor, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}><Dices size={18} /><span>{status}</span></div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: dice.length > 1 ? 8 : 12, flexWrap: 'wrap' }}>
          {dice.map((die, index) => {
            const isRevealed = Boolean(revealed[index]);
            const isNat20 = die.sides === 20 && die.result === 20;
            const isNat1 = die.sides === 20 && die.result === 1;
            const dieColor = isRevealed && isNat20 ? CRIT_GREEN : isRevealed && isNat1 ? FUMBLE_RED : colors.text;
            const targetStep = wheelTargetStep(die, index);
            const duration = isHpLevelRoll ? 3200 + index * 520 : 2600 + index * 520;
            return (
              <div key={die.id} style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                <div style={{ width: wheelWidth, height: wheelHeight, overflow: 'hidden', border: `1px solid ${isRevealed && (isNat20 || isNat1) ? dieColor : colors.border}`, background: colors.card, display: 'block', position: 'relative', boxShadow: isRevealed && (isNat20 || isNat1) ? `0 0 24px ${dieColor}66` : 'none' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: isRevealed ? colors.accent : colors.border, opacity: isRevealed ? 0.8 : 0.35 }} />
                  <div style={{ transform: `translateY(-${wheelStarted ? targetStep * wheelHeight : 0}px)`, transition: wheelStarted ? `transform ${duration}ms ${WHEEL_EASE}` : 'none' }}>
                    {wheelNumbers(die, index).map((number, itemIndex) => (
                      <div key={`${die.id}-${itemIndex}`} style={{ height: wheelHeight, display: 'grid', placeItems: 'center', color: itemIndex === targetStep && isRevealed ? dieColor : colors.text, fontSize, lineHeight: 1, fontWeight: 950, fontVariantNumeric: 'tabular-nums', textShadow: itemIndex === targetStep && isRevealed && (isNat20 || isNat1) ? `0 0 22px ${dieColor}88` : 'none' }}>
                        {number}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ color: isRevealed ? colors.text : colors.muted, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{die.exploded ? 'Explode' : `d${die.sides}`}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          <div style={{ minHeight: isHpLevelRoll ? 72 : 58, display: 'grid', placeItems: 'center', color: showTotal ? statusColor : colors.muted, fontSize: showTotal ? (isHpLevelRoll ? 66 : 48) : 16, lineHeight: 1, fontWeight: 950, fontVariantNumeric: 'tabular-nums', transition: 'font-size 240ms ease, color 220ms ease, text-shadow 220ms ease', textShadow: showTotal && (isCrit || isFumble) ? `0 0 26px ${statusColor}77` : 'none' }}>{showTotal ? finalDisplayValue : dice.length > 1 ? 'Revealing dice…' : 'Wheel slowing…'}</div>
          <div style={{ color: colors.muted, fontSize: isHpLevelRoll ? 13 : 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{showTotal ? (rollDetail || label) : `${dice.length} wheel${dice.length === 1 ? '' : 's'} rolling from 1 to ${Math.max(...dice.map(die => die.sides))}`}</div>
          {showTotal && Number(modifier) !== 0 && <div style={{ color: colors.muted, fontSize: 11, fontWeight: 800 }}>Dice {diceSubtotal}{formatModifier(modifier)} = {finalDisplayValue}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
