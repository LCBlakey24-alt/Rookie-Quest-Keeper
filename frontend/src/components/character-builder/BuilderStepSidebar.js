import React from 'react';
import { Check } from 'lucide-react';
import { builderTheme as theme } from './builderTheme';

export default function BuilderStepSidebar({ steps, current, onJump }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto', padding: '4px 0' }}>
      {steps.map((s, i) => {
        const Icon = s.icon;
        const completed = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s.id}>
            <button
              onClick={() => onJump(i)} type="button"
              data-testid={`step-${s.id}`}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 12px', borderRadius: '20px',
                background: active ? theme.sunset.gold :
                  completed ? 'rgba(16, 185, 129, 0.15)' : theme.bg.surface,
                border: active ? `1px solid ${theme.sunset.gold}` :
                  completed ? '1px solid rgba(16, 185, 129, 0.3)' : `1px solid ${theme.border}`,
                color: active ? theme.bg.primary : completed ? '#10B981' : theme.text.muted,
                cursor: 'pointer', fontSize: '12px', fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}>
              {completed ? <Check size={14} /> : <Icon size={14} />}
              <span>{i + 1}. {s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div style={{
                flex: '0 0 12px', height: '2px',
                background: completed ? 'rgba(16, 185, 129, 0.4)' : theme.border,
                borderRadius: '1px'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
