import React from 'react';
import { levelUpTheme as theme } from './levelUpTheme';

export default function LevelUpPlanSummary({ items }) {
  return (
    <div data-testid="levelup-plan-summary" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: '8px',
      marginBottom: '14px'
    }}>
      {items.map((item) => (
        <div key={item.label} style={{
          border: `1px solid ${theme.border}`,
          background: 'rgba(13, 18, 36, 0.72)',
          borderRadius: '10px',
          padding: '10px',
          minWidth: 0
        }}>
          <div style={{ color: theme.text.muted, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {item.label}
          </div>
          <div style={{ color: theme.text.primary, fontSize: '13px', fontWeight: 800, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
