import React, { useState } from 'react';
import { Network, Sparkles, Users } from 'lucide-react';
import NPCsTab from './NPCsTab';
import NPCRelationshipWeb from '../NPCRelationshipWeb';
import QuickNpcGenerator from '../gm/QuickNpcGenerator';

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const theme = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)', primary: '#d00000', border: 'rgba(255,255,255,0.16)',
};

function NPCsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('list');
  const subTabs = [
    { id: 'list', label: 'NPCs', icon: Users },
    { id: 'generate', label: 'Rookie Generator', icon: Sparkles },
    { id: 'web', label: 'Relationships', icon: Network },
  ];

  return (
    <section data-testid="npcs-consolidated-tab" style={shellStyle}>
      <nav style={tabsStyle} aria-label="NPC tools">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} data-testid={`npcs-subtab-${tab.id}`} style={tabButtonStyle(active)}>
              <Icon size={16} />
              <strong>{tab.label}</strong>
            </button>
          );
        })}
      </nav>

      <main style={contentStyle}>
        {activeSubTab === 'list' && <NPCsTab campaignId={campaignId} />}
        {activeSubTab === 'generate' && <QuickNpcGenerator campaignId={campaignId} theme={theme} />}
        {activeSubTab === 'web' && <NPCRelationshipWeb campaignId={campaignId} />}
      </main>
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 8, minWidth: 0, fontFamily: fontStack };
const tabsStyle = { display: 'flex', gap: 1, overflowX: 'auto', background: theme.border, border: `1px solid ${theme.border}` };
const tabButtonStyle = active => ({ minWidth: 120, minHeight: 44, padding: '0 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: active ? theme.primary : theme.card, border: 0, color: theme.text, cursor: 'pointer', fontFamily: fontStack, whiteSpace: 'nowrap' });
const contentStyle = { minWidth: 0 };

export default NPCsConsolidatedTab;
