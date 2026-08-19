import React from 'react';
import { Sparkles, UserCircle, Users } from 'lucide-react';
import NPCQuickReference from '@/components/NPCQuickReference';
import CampaignCompanionsPanel from './CampaignCompanionsPanel';
import QuickNpcGenerator from './QuickNpcGenerator';

export default function NpcsTab({ theme = {}, campaignId }) {
  const text = theme.text?.primary || '#ffffff';
  const soft = theme.text?.secondary || 'rgba(255,255,255,0.74)';
  const muted = theme.text?.muted || 'rgba(255,255,255,0.58)';
  const card = theme.bg?.card || '#3a3a3a';
  const panel = theme.bg?.panel || '#2f2f2f';
  const border = theme.border || 'rgba(255,255,255,0.16)';
  const accent = theme.accent?.gm || theme.accent?.primary || '#d00000';

  return (
    <div data-testid="live-npcs-panel" style={{ display: 'grid', gap: 9 }}>
      <header style={{ background: card, border: `1px solid ${border}`, borderLeft: `5px solid ${accent}`, padding: 11 }}>
        <p style={{ margin: 0, color: muted, fontSize: 9, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Reference</p>
        <h2 style={{ margin: '3px 0 0', color: text, fontSize: 21, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 7 }}><UserCircle size={20} /> NPCs</h2>
      </header>

      <CampaignCompanionsPanel campaignId={campaignId} compact />

      <section style={{ background: panel, border: `1px solid ${border}`, padding: 10 }}>
        <h3 style={{ margin: '0 0 8px', color: text, fontSize: 14, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={15} /> Saved NPCs</h3>
        <NPCQuickReference campaignId={campaignId} />
      </section>

      <details style={{ background: panel, border: `1px solid ${border}` }}>
        <summary style={{ minHeight: 40, padding: '0 10px', color: soft, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontWeight: 900, fontSize: 12, listStyle: 'none' }}>
          <Sparkles size={14} color={accent} /> Need an emergency NPC?
        </summary>
        <div style={{ padding: 10, borderTop: `1px solid ${border}` }}>
          <QuickNpcGenerator theme={theme} campaignId={campaignId} />
        </div>
      </details>
    </div>
  );
}
