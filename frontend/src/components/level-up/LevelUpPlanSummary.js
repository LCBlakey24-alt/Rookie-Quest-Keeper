import React from 'react';
import { levelUpTheme as theme } from './levelUpTheme';

export default function LevelUpPlanSummary({ items }) {
  return (
    <div data-testid="levelup-plan-summary" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 0,
      marginBottom: '18px',
      borderTop: '1px solid var(--rq-line, rgba(246, 234, 210, 0.18))'
    }}>
      {items.map((item) => (
        <div key={item.label} style={{
          border: 0,
          background: 'transparent',
          borderRadius: 0,
          padding: '10px 8px 10px 0',
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
