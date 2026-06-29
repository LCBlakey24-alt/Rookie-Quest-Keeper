import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';

const characterCache = new Map();

const palette = {
  player: { bg: 'rgba(36,36,36,0.96)', panel: '#2f2f2f', card: '#3a3a3a', accent: '#d00000', text: '#ffffff', muted: 'rgba(255,255,255,0.68)' },
  gm: { bg: 'rgba(36,36,36,0.96)', panel: '#2f2f2f', card: '#3a3a3a', accent: '#d00000', text: '#ffffff', muted: 'rgba(255,255,255,0.68)' },
};

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
    const baseSpin = isHpLevelRoll ? 2600 : 2100;
    const revealGap = dice.length > 1 ? 360 : 0;
    const finalReveal = baseSpin + revealGap * Math.max(0, dice.length - 1);
    const holdDuration = isHpLevelRoll ? 3600 : 4200;

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

    timers.push(window.setTimeout(() => { setShowTotal(true); setSettled(true); }, finalReveal + 320));
    timers.push(window.setTimeout(() => setFading(true), finalReveal + holdDuration - 500));
    timers.push(window.setTimeout(() => { onCloseRef.current?.(); }, finalReveal + holdDuration));
    return () => { timers.forEach(id => window.clearTimeout(id)); };
  }, [visible, label, dice, isHpLevelRoll]);

  if (!visible) return null;

  const statusColor = settled && isFumble ? colors.accent : colors.text;
  const status = settled ? (isCrit ? 'Natural 20' : isFumble ? 'Natural 1' : label || 'Result') : (isHpLevelRoll ? 'Rolling hit points…' : 'Rolling…');
  const shellPosition = { left: '50%', bottom: isHpLevelRoll ? '72px' : '24px', transform: 'translateX(-50%)' };
  const diceSubtotal = dice.reduce((sum, die) => sum + Number(die.result || 0), 0);
  const wheelHeight = isHpLevelRoll ? 58 : 44;
  const wheelWidth = isHpLevelRoll ? 54 : 42;
  const fontSize = isHpLevelRoll ? 34 : 26;

  return createPortal(
    <div aria-live="polite" style={{ position: 'fixed', ...shellPosition, zIndex: 3000, pointerEvents: 'none', fontFamily: 'var(--rq-body-font, Manrope, Inter, sans-serif)', opacity: fading ? 0 : 1, transition: 'opacity 500ms ease' }}>
      <div style={{ maxWidth: 'calc(100vw - 24px)', padding: '8px 10px', borderRadius: 0, background: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dice.length > 1 ? 5 : 7 }}>
          {dice.map((die, index) => {
            const isRevealed = Boolean(revealed[index]);
            const isNat1 = die.sides === 20 && die.result === 1;
            const dieColor = isRevealed && isNat1 ? colors.accent : colors.text;
            const targetStep = wheelTargetStep(die, index);
            const duration = isHpLevelRoll ? 2600 + index * 360 : 2100 + index * 360;
            return (
              <div key={die.id} style={{ display: 'grid', gap: 2, justifyItems: 'center' }}>
                <div style={{ width: wheelWidth, height: wheelHeight, overflow: 'hidden', background: colors.card, display: 'block', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 2, background: isRevealed ? colors.accent : 'transparent', opacity: isRevealed ? 0.8 : 0 }} />
                  <div style={{ transform: `translateY(-${wheelStarted ? targetStep * wheelHeight : 0}px)`, transition: wheelStarted ? `transform ${duration}ms ${WHEEL_EASE}` : 'none' }}>
                    {wheelNumbers(die, index).map((number, itemIndex) => (
                      <div key={`${die.id}-${itemIndex}`} style={{ height: wheelHeight, display: 'grid', placeItems: 'center', color: itemIndex === targetStep && isRevealed ? dieColor : colors.text, fontSize, lineHeight: 1, fontWeight: 950, fontVariantNumeric: 'tabular-nums' }}>
                        {number}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ color: colors.muted, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{die.exploded ? 'ex' : `d${die.sides}`}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span style={{ color: statusColor, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{status}</span>
            <strong style={{ color: colors.text, fontSize: showTotal ? 30 : 13, lineHeight: 1, fontWeight: 950, fontVariantNumeric: 'tabular-nums', transition: 'font-size 180ms ease' }}>{showTotal ? finalDisplayValue : 'rolling'}</strong>
          </div>
          <div style={{ color: colors.muted, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{showTotal ? (rollDetail || label) : `${dice.length} wheel${dice.length === 1 ? '' : 's'} scrolling`}</div>
          {showTotal && Number(modifier) !== 0 && <div style={{ color: colors.muted, fontSize: 10, fontWeight: 800 }}>Dice {diceSubtotal}{formatModifier(modifier)} = {finalDisplayValue}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
