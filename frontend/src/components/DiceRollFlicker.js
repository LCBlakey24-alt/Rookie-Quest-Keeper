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
  const [values, setValues] = useState(() => dice.map(die => die.result));
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
    const baseSpin = isHpLevelRoll ? 2500 : 2050;
    const revealGap = dice.length > 1 ? 420 : 0;
    const finalReveal = baseSpin + revealGap * Math.max(0, dice.length - 1);
    const holdDuration = isHpLevelRoll ? 4200 : 5000;

    setSettled(false);
    setShowTotal(false);
    setFading(false);
    setRevealed(dice.map(() => false));
    setValues(dice.map((die, index) => (index % die.sides) + 1));

    dice.forEach((die, dieIndex) => {
      const tickCount = 34 + dieIndex * 5 + (isHpLevelRoll ? 8 : 0);
      const dieDuration = baseSpin + revealGap * dieIndex;
      for (let tick = 1; tick <= tickCount; tick += 1) {
        const delay = Math.round(dieDuration * Math.pow(tick / tickCount, 1.95));
        timers.push(window.setTimeout(() => {
          setValues(prev => {
            const next = [...prev];
            next[dieIndex] = tick === tickCount ? die.result : ((tick + dieIndex) % die.sides) + 1;
            return next;
          });
          if (tick === tickCount) setRevealed(prev => prev.map((item, index) => index === dieIndex ? true : item));
        }, delay));
      }
    });

    timers.push(window.setTimeout(() => { setShowTotal(true); setSettled(true); }, finalReveal + 450));
    timers.push(window.setTimeout(() => setFading(true), finalReveal + holdDuration - 650));
    timers.push(window.setTimeout(() => { onCloseRef.current?.(); }, finalReveal + holdDuration));
    return () => { timers.forEach(id => window.clearTimeout(id)); };
  }, [visible, label, dice, isHpLevelRoll]);

  if (!visible) return null;

  const statusColor = settled && isCrit ? CRIT_GREEN : settled && isFumble ? FUMBLE_RED : colors.accent;
  const status = settled ? (isCrit ? 'Natural 20' : isFumble ? 'Natural 1' : label || 'Result') : (isHpLevelRoll ? 'Rolling hit points…' : 'Rolling…');
  const shellPosition = isHpLevelRoll ? { left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${settled ? 1 : 1.025})` } : { left: '50%', bottom: '58px', transform: `translateX(-50%) scale(${settled ? 1 : 1.018})` };
  const diceSubtotal = dice.reduce((sum, die) => sum + Number(die.result || 0), 0);

  return createPortal(
    <div aria-live="polite" style={{ position: 'fixed', ...shellPosition, zIndex: 3000, pointerEvents: 'none', fontFamily: 'var(--rq-body-font, Manrope, Inter, sans-serif)', opacity: fading ? 0 : 1, transition: 'opacity 650ms ease, transform 360ms ease' }}>
      <div style={{ minWidth: isHpLevelRoll ? 360 : 330, maxWidth: 'calc(100vw - 28px)', padding: isHpLevelRoll ? '24px 26px' : '16px 18px', borderRadius: 0, background: colors.bg, border: `1px solid ${settled && (isCrit || isFumble) ? statusColor : colors.border}`, boxShadow: `0 22px 70px rgba(0,0,0,0.52), 0 0 30px ${statusColor}55`, display: 'grid', gap: 14, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, color: statusColor, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}><Dices size={18} /><span>{status}</span></div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: dice.length > 1 ? 8 : 12, flexWrap: 'wrap' }}>
          {dice.map((die, index) => {
            const isRevealed = Boolean(revealed[index]);
            const dieColor = isRevealed && die.sides === 20 && die.result === 20 ? CRIT_GREEN : isRevealed && die.sides === 20 && die.result === 1 ? FUMBLE_RED : statusColor;
            return (
              <div key={die.id} style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                <div style={{ width: isHpLevelRoll ? 96 : 82, height: isHpLevelRoll ? 116 : 98, overflow: 'hidden', border: `1px solid ${isRevealed ? dieColor : colors.border}`, background: colors.card, display: 'grid', placeItems: 'center', position: 'relative', boxShadow: isRevealed ? `0 0 26px ${dieColor}66` : 'inset 0 0 0 1px rgba(255,255,255,0.04)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 24%, transparent 76%, rgba(0,0,0,0.24))' }} />
                  <div style={{ color: dieColor, fontSize: isHpLevelRoll ? 62 : 52, lineHeight: 1, fontWeight: 950, fontVariantNumeric: 'tabular-nums', transform: isRevealed ? 'scale(1.05)' : 'scale(0.98)', transition: 'transform 220ms ease, color 220ms ease, text-shadow 220ms ease', textShadow: isRevealed ? `0 0 24px ${dieColor}88` : 'none' }}>{values[index] ?? die.result}</div>
                </div>
                <div style={{ color: isRevealed ? colors.text : colors.muted, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{die.exploded ? 'Explode' : `d${die.sides}`}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          <div style={{ minHeight: isHpLevelRoll ? 72 : 58, display: 'grid', placeItems: 'center', color: showTotal ? statusColor : colors.muted, fontSize: showTotal ? (isHpLevelRoll ? 66 : 48) : 16, lineHeight: 1, fontWeight: 950, fontVariantNumeric: 'tabular-nums', transition: 'font-size 240ms ease, color 220ms ease, text-shadow 220ms ease', textShadow: showTotal ? `0 0 26px ${statusColor}77` : 'none' }}>{showTotal ? finalDisplayValue : dice.length > 1 ? 'Revealing dice…' : 'Slowing down…'}</div>
          <div style={{ color: colors.muted, fontSize: isHpLevelRoll ? 13 : 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{showTotal ? (rollDetail || label) : `${dice.length} wheel${dice.length === 1 ? '' : 's'} spinning from 1 to ${Math.max(...dice.map(die => die.sides))}`}</div>
          {showTotal && Number(modifier) !== 0 && <div style={{ color: colors.muted, fontSize: 11, fontWeight: 800 }}>Dice {diceSubtotal}{formatModifier(modifier)} = {finalDisplayValue}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
