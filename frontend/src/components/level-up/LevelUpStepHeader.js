import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { levelUpTheme as theme } from './levelUpTheme';

export default function LevelUpStepHeader({ onClose, characterName, characterClass, currentLevel, newLevel, totalSteps, step }) {
  return (
    <div style={{
      background: theme.gradient,
      padding: '24px',
      position: 'relative'
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(0,0,0,0.2)',
          border: 'none',
          borderRadius: '50%',
          padding: '8px',
          cursor: 'pointer',
          color: '#fff'
        }}
      >
        <X size={20} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Sparkles size={32} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '24px', color: '#fff', margin: 0, fontWeight: '600' }}>
            Level Up!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: '15px' }}>
            {characterName} • {characterClass} {currentLevel} → {newLevel}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: i < step ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'background 0.3s'
            }}
          />
        ))}
      </div>
    </div>
  );
}
