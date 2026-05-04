import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dices } from 'lucide-react';

const palette = {
  player: {
    bg: 'rgba(10, 22, 40, 0.96)',
    border: 'rgba(212, 160, 23, 0.42)',
    accent: '#D4A017',
    text: '#F8FAFC',
    muted: '#94A3B8',
  },
  gm: {
    bg: 'rgba(10, 22, 40, 0.97)',
    border: 'rgba(212, 160, 23, 0.5)',
    accent: '#D4A017',
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
  onClose,
  rolls = [],
  label,
  modifier = 0,
  total = 0,
  isCrit = false,
  isFumble = false,
  theme = 'player',
}) {
  const colors = palette[theme] || palette.player;
  const onCloseRef = useRef(onClose);
  const [displayValue, setDisplayValue] = useState(total);
  const [settled, setSettled] = useState(true);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const rollDetail = useMemo(() => {
    const base = rolls.map((roll) => `d${roll.sides}: ${roll.result}`).join(' + ');
    return `${base}${formatModifier(modifier)}`;
  }, [modifier, rolls]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const highestSide = rolls.reduce((max, roll) => Math.max(max, roll.sides || 0), 20);
    const ceiling = Math.max(highestSide, Number(total) + 12, 20);
    let ticks = 0;

    setSettled(false);
    setDisplayValue(Math.max(1, Math.floor(Math.random() * ceiling) + 1));

    const flickerId = window.setInterval(() => {
      ticks += 1;
      setDisplayValue(Math.max(1, Math.floor(Math.random() * ceiling) + 1));
      if (ticks >= 12) {
        window.clearInterval(flickerId);
        setDisplayValue(total);
        setSettled(true);
      }
    }, 36);

    const closeId = window.setTimeout(() => {
      onCloseRef.current?.();
    }, 1900);

    return () => {
      window.clearInterval(flickerId);
      window.clearTimeout(closeId);
    };
  }, [isOpen, label, rolls, total]);

  if (!isOpen) return null;

  const status = isCrit ? 'Natural 20' : isFumble ? 'Natural 1' : label;
  const statusColor = isCrit ? '#22C55E' : isFumble ? '#EF4444' : colors.accent;

  return createPortal(
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '58px',
        transform: 'translateX(-50%)',
        zIndex: 3000,
        pointerEvents: 'none',
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <div
        style={{
          minWidth: 220,
          maxWidth: 'calc(100vw - 32px)',
          padding: '10px 14px',
          borderRadius: 8,
          background: colors.bg,
          border: `1px solid ${isCrit || isFumble ? statusColor : colors.border}`,
          boxShadow: `0 12px 36px rgba(0,0,0,0.35), 0 0 0 1px ${isCrit || isFumble ? `${statusColor}33` : 'transparent'}`,
          display: 'grid',
          gridTemplateColumns: '36px 1fr',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${statusColor}22`,
            border: `1px solid ${statusColor}55`,
            color: statusColor,
          }}
        >
          <Dices size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <div
              style={{
                color: colors.text,
                fontSize: 12,
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
                fontSize: settled ? 26 : 24,
                lineHeight: 1,
                fontWeight: 900,
                minWidth: 52,
                textAlign: 'right',
                transition: 'font-size 80ms ease',
              }}
            >
              {displayValue}
            </div>
          </div>
          <div
            style={{
              color: colors.muted,
              fontSize: 10,
              fontWeight: 700,
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {rollDetail || label}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
