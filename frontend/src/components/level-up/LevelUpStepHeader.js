import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { levelUpTheme as theme } from './levelUpTheme';

export default function LevelUpStepHeader({ onClose, characterName, characterClass, currentLevel, newLevel, totalSteps, step }) {
  return (
    <div style={{
      background: 'transparent',
      padding: '24px 0 18px',
      position: 'relative',
      borderBottom: '1px solid var(--rq-line, rgba(246, 234, 210, 0.18))'
    }}>
      <button
        onClick={onClose}
        aria-label="Close level up"
        style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          padding: '8px',
          cursor: 'pointer',
          color: theme.text.primary
        }}
      >
        <X size={20} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingRight: '42px' }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: 0,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Sparkles size={26} color="var(--rq-primary, #d8ad4f)" />
        </div>
        <div>
          <h2 style={{
            fontSize: '28px',
            color: theme.text.primary,
            margin: 0,
            fontWeight: 400,
            fontFamily: "var(--rq-title-font, 'Metal Mania', Georgia, serif)",
            letterSpacing: '0.045em',
            WebkitTextStroke: '0.35px var(--rq-bg, #070814)',
            paintOrder: 'stroke fill'
          }}>
            Level Up
          </h2>
          <p style={{ color: theme.text.secondary, margin: '4px 0 0', fontSize: '14px' }}>
            {characterName} • {characterClass} {currentLevel} → {newLevel}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '18px' }} aria-label="Level up progress">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: 0,
              background: i < step ? 'var(--rq-primary, #d8ad4f)' : 'var(--rq-line, rgba(246, 234, 210, 0.18))',
              transition: 'background 0.2s'
            }}
          />
        ))}
      </div>
    </div>
  );
}
