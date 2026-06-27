import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dices } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { recordRemoteRoll } from '@/lib/sessionRollStats';

const characterCache = new Map();

const palette = {
  player: { bg: 'rgba(33, 21, 14, 0.96)', border: 'rgba(192, 138, 61, 0.46)', accent: '#E0B15C', text: '#F5E6C8', muted: '#CDBA98' },
  gm: { bg: 'rgba(33, 21, 14, 0.97)', border: 'rgba(192, 138, 61, 0.52)', accent: '#E0B15C', text: '#F5E6C8', muted: '#E6D2AA' },
};

const formatModifier = (modifier) => {
  const value = Number(modifier) || 0;
  if (value === 0) return '';
  return value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
};

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
  const [displayValue, setDisplayValue] = useState(total);
  const [settled, setSettled] = useState(true);
  const [fading, setFading] = useState(false);
  const isHpLevelRoll = String(label || '').startsWith('HP d');

  useEffect(() => { onCloseRef.current = onClose || onComplete; }, [onClose, onComplete]);

  const rollDetail = useMemo(() => {
    const base = rolls.map((roll) => `${roll.exploded ? '↳ ' : ''}d${roll.sides}: ${roll.result}`).join(' + ');
    const explosionText = rolls.some((roll) => roll.exploded) ? ' • exploding dice' : '';
    return `${base}${formatModifier(modifier)}${explosionText}`;
  }, [modifier, rolls]);

  const finalDisplayValue = Number(animationValue ?? total) || 0;

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
        isCrit,
        isFumble,
        explosionCount: rolls.filter(roll => roll.exploded).length,
      });
    });
    return () => { cancelled = true; };
  }, [visible, theme, label, total, modifier, rolls, isCrit, isFumble]);

  useEffect(() => {
    if (!visible) return undefined;
    const highestSide = rolls.reduce((max, roll) => Math.max(max, roll.sides || 0), 20);
    const ceiling = Math.max(highestSide, Number(total) + 12, 20);
    const timeouts = [];
    const flickerDuration = isHpLevelRoll ? 4600 : 4000;
    const holdDuration = isHpLevelRoll ? 4200 : 5000;
    const tickCount = isHpLevelRoll ? 42 : 34;
    setSettled(false);
    setFading(false);
    setDisplayValue(Math.max(1, Math.floor(Math.random() * ceiling) + 1));
    for (let tick = 1; tick <= tickCount; tick += 1) {
      const progress = tick / tickCount;
      const delay = Math.round(flickerDuration * Math.pow(progress, 1.85));
      timeouts.push(window.setTimeout(() => {
        if (tick === tickCount) { setDisplayValue(finalDisplayValue); setSettled(true); }
        else setDisplayValue(Math.max(1, Math.floor(Math.random() * ceiling) + 1));
      }, delay));
    }
    timeouts.push(window.setTimeout(() => setFading(true), flickerDuration + holdDuration - 650));
    timeouts.push(window.setTimeout(() => { onCloseRef.current?.(); }, flickerDuration + holdDuration));
    return () => { timeouts.forEach(id => window.clearTimeout(id)); };
  }, [visible, label, rolls, total, finalDisplayValue, isHpLevelRoll]);

  if (!visible) return null;
  const resolvedStatus = isCrit ? 'Natural 20' : isFumble ? 'Natural 1' : label;
  const status = settled ? resolvedStatus : (isHpLevelRoll ? 'Rolling hit points…' : 'Rolling…');
  const statusColor = settled && isCrit ? '#22C55E' : settled && isFumble ? '#EF4444' : colors.accent;
  const shellPosition = isHpLevelRoll ? { left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${settled ? 1 : 1.04})` } : { left: '50%', bottom: '58px', transform: `translateX(-50%) scale(${settled ? 1 : 1.03})` };

  return createPortal(
    <div aria-live="polite" style={{ position: 'fixed', ...shellPosition, zIndex: 3000, pointerEvents: 'none', fontFamily: "'Montserrat', sans-serif", opacity: fading ? 0 : 1, transition: 'opacity 650ms ease, transform 360ms ease' }}>
      <div style={{ minWidth: isHpLevelRoll ? 330 : 280, maxWidth: 'calc(100vw - 32px)', padding: isHpLevelRoll ? '26px 28px' : '18px 20px', borderRadius: isHpLevelRoll ? 28 : 18, background: colors.bg, border: `1px solid ${isCrit || isFumble ? statusColor : colors.border}`, boxShadow: isHpLevelRoll ? `0 28px 90px rgba(0,0,0,0.58), 0 0 70px ${statusColor}33, inset 0 0 0 1px rgba(245, 230, 200, 0.06)` : `0 12px 36px rgba(0,0,0,0.35), 0 0 0 1px ${isCrit || isFumble ? `${statusColor}33` : 'transparent'}`, display: 'grid', gridTemplateColumns: isHpLevelRoll ? '1fr' : '52px 1fr', gap: isHpLevelRoll ? 16 : 14, alignItems: 'center', textAlign: isHpLevelRoll ? 'center' : 'left' }}>
        <div style={{ width: isHpLevelRoll ? 72 : 52, height: isHpLevelRoll ? 72 : 52, borderRadius: isHpLevelRoll ? 24 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${statusColor}22`, border: `1px solid ${statusColor}55`, color: statusColor, margin: isHpLevelRoll ? '0 auto' : 0 }}><Dices size={isHpLevelRoll ? 34 : 24} /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: isHpLevelRoll ? 'center' : 'space-between', gap: 12, flexWrap: isHpLevelRoll ? 'wrap' : 'nowrap' }}>
            <div style={{ color: colors.text, fontSize: isHpLevelRoll ? 16 : 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{status}</div>
            <div style={{ color: statusColor, fontSize: isHpLevelRoll ? (settled ? 96 : 82) : (settled ? 48 : 42), lineHeight: 1, fontWeight: 950, minWidth: isHpLevelRoll ? '100%' : 82, textAlign: isHpLevelRoll ? 'center' : 'right', transition: 'font-size 220ms ease, text-shadow 220ms ease', textShadow: settled ? `0 0 28px ${statusColor}77` : 'none' }}>{displayValue}</div>
          </div>
          <div style={{ color: colors.muted, fontSize: isHpLevelRoll ? 13 : 12, fontWeight: 700, marginTop: isHpLevelRoll ? 8 : 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{settled ? (rollDetail || label) : (isHpLevelRoll ? 'No peeking. The hit die is still spinning…' : 'The dice are still tumbling…')}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
