import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dices } from 'lucide-react';

const palette = {
  player: {
    bg: 'rgba(10, 22, 40, 0.96)',
    border: 'rgba(124, 58, 237, 0.46)',
    accent: '#A78BFA',
    text: '#F8FAFC',
    muted: '#94A3B8',
  },
  gm: {
    bg: 'rgba(10, 22, 40, 0.97)',
    border: 'rgba(124, 58, 237, 0.52)',
    accent: '#A78BFA',
    text: '#F8FAFC',
    muted: '#CBD5E1',
  },
};

const formatModifier = (modifier) => {
  const value = Number(modifier) || 0;
  if (value === 0) return '';
  return value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
};

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
  const [displayValue, setDisplayValue] = useState(Number(animationValue ?? total) || 0);
  const [settled, setSettled] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose || onComplete;
  }, [onClose, onComplete]);

  const rollDetail = useMemo(() => {
    const base = rolls.map((roll) => `${roll.exploded ? '↳ ' : ''}d${roll.sides}: ${roll.result}`).join(' + ');
    const explosionText = rolls.some((roll) => roll.exploded) ? ' • exploding dice' : '';
    return `${base}${formatModifier(modifier)}${explosionText}`;
  }, [modifier, rolls]);

  const finalDisplayValue = Number(animationValue ?? total) || 0;

  useEffect(() => {
    if (!visible) return undefined;

    const highestSide = rolls.reduce((max, roll) => Math.max(max, roll.sides || 0), 20);
    const ceiling = Math.max(highestSide, finalDisplayValue || Number(total) || 0, 20);
    const timeouts = [];
    const flickerDuration = 4000;
    const holdDuration = 5000;
    const tickCount = 34;

    setSettled(false);
    setFading(false);
    setDisplayValue(1);

    for (let tick = 1; tick <= tickCount; tick += 1) {
      const progress = tick / tickCount;
      const delay = Math.round(flickerDuration * Math.pow(progress, 1.85));
      timeouts.push(window.setTimeout(() => {
        if (tick === tickCount) {
          setDisplayValue(finalDisplayValue || total);
          setSettled(true);
        } else {
          setDisplayValue(((tick - 1) % ceiling) + 1);
        }
      }, delay));
    }

    timeouts.push(window.setTimeout(() => setFading(true), flickerDuration + holdDuration - 650));
    timeouts.push(window.setTimeout(() => {
      onCloseRef.current?.();
    }, flickerDuration + holdDuration));

    return () => {
      timeouts.forEach(id => window.clearTimeout(id));
    };
  }, [visible, label, rolls, total, finalDisplayValue]);

  if (!visible) return null;

  const resolvedStatus = isCrit ? 'Natural 20' : isFumble ? 'Natural 1' : label;
  const status = settled ? resolvedStatus : 'Rolling…';
  const statusColor = settled && isCrit ? '#22C55E' : settled && isFumble ? '#EF4444' : colors.accent;

  return createPortal(
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '58px',
        transform: `translateX(-50%) scale(${settled ? 1 : 1.03})`,
        zIndex: 3000,
        pointerEvents: 'none',
        fontFamily: "'Montserrat', sans-serif",
        opacity: fading ? 0 : 1,
        transition: 'opacity 650ms ease, transform 360ms ease',
      }}
    >
      <div
        style={{
          minWidth: 280,
          maxWidth: 'calc(100vw - 32px)',
          padding: '18px 20px',
          borderRadius: 18,
          background: colors.bg,
          border: `1px solid ${isCrit || isFumble ? statusColor : colors.border}`,
          boxShadow: `0 12px 36px rgba(0,0,0,0.35), 0 0 0 1px ${isCrit || isFumble ? `${statusColor}33` : 'transparent'}`,
          display: 'grid',
          gridTemplateColumns: '52px 1fr',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${statusColor}22`,
            border: `1px solid ${statusColor}55`,
            color: statusColor,
          }}
        >
          <Dices size={24} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <div
              style={{
                color: colors.text,
                fontSize: 14,
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {status}
            </div>
            <div
              style={{
                color: statusColor,
                fontSize: settled ? 48 : 42,
                lineHeight: 1,
                fontWeight: 900,
                minWidth: 82,
                textAlign: 'right',
                transition: 'font-size 220ms ease, text-shadow 220ms ease',
                textShadow: settled ? `0 0 22px ${statusColor}66` : 'none',
              }}
            >
              {displayValue}
            </div>
          </div>
          <div
            style={{
              color: colors.muted,
              fontSize: 12,
              fontWeight: 700,
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {settled ? (rollDetail || label) : 'The dice are still tumbling…'}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
