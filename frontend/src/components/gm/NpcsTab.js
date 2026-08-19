import React from 'react';
import { Sparkles } from 'lucide-react';
import LiveNpcLookup from './LiveNpcLookup';
import QuickNpcGenerator from './QuickNpcGenerator';

export default function NpcsTab({ theme = {}, campaignId }) {
  const soft = theme.text?.secondary || 'rgba(255,255,255,0.74)';
  const panel = theme.bg?.panel || '#2f2f2f';
  const border = theme.border || 'rgba(255,255,255,0.16)';
  const accent = theme.accent?.gm || theme.accent?.primary || '#d00000';

  return (
    <div data-testid="live-npcs-panel" style={{ display: 'grid', gap: 7 }}>
      <LiveNpcLookup campaignId={campaignId} />

      <details style={{ background: panel, border: `1px solid ${border}` }}>
        <summary style={{ minHeight: 38, padding: '0 9px', color: soft, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: 11, listStyle: 'none' }}>
          <Sparkles size={13} color={accent} /> Emergency NPC
        </summary>
        <div style={{ padding: 8, borderTop: `1px solid ${border}` }}>
          <QuickNpcGenerator theme={theme} campaignId={campaignId} />
        </div>
      </details>
    </div>
  );
}
