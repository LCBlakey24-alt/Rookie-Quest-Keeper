import React from 'react';

export default function LevelUpPreflightSkeleton() {
  return (
    <div data-testid="levelup-preflight-skeleton" style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
      background: 'rgba(124, 58, 237, 0.08)',
      border: '1px solid rgba(124, 58, 237, 0.24)',
      borderRadius: 8, marginBottom: 12,
    }}>
      <div style={{ width: '60%', height: 14, background: 'rgba(124, 58, 237, 0.16)', borderRadius: 4 }} />
      <div style={{ width: '85%', height: 10, background: 'rgba(34, 211, 238, 0.12)', borderRadius: 4 }} />
      <div style={{ width: '40%', height: 10, background: 'rgba(34, 211, 238, 0.12)', borderRadius: 4 }} />
      <div style={{ fontSize: 11, color: 'rgba(196, 181, 253, 0.88)', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>
        Loading level-up options…
      </div>
    </div>
  );
}
