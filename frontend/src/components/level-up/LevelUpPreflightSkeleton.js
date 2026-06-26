import React from 'react';

export default function LevelUpPreflightSkeleton() {
  const lineStyle = {
    height: 10,
    background: 'rgba(246, 234, 210, 0.16)',
    borderRadius: 0,
  };

  return (
    <div data-testid="levelup-preflight-skeleton" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '12px 0',
      background: 'transparent',
      border: 0,
      borderTop: '1px solid var(--rq-line, rgba(246, 234, 210, 0.18))',
      borderRadius: 0,
      marginBottom: 12,
    }}>
      <div style={{ ...lineStyle, width: '60%' }} />
      <div style={{ ...lineStyle, width: '85%' }} />
      <div style={{ ...lineStyle, width: '40%' }} />
      <div style={{ fontSize: 11, color: 'var(--rq-muted, rgba(246, 234, 210, 0.64))', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>
        Loading level-up options…
      </div>
    </div>
  );
}
