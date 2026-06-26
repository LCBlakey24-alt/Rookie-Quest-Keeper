import React, { useState } from 'react';
import { Users, Network } from 'lucide-react';
import NPCsTab from './NPCsTab';
import NPCRelationshipWeb from '../NPCRelationshipWeb';

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.62)',
  soft: 'rgba(255,255,255,0.74)',
  primary: '#d00000',
  border: 'rgba(255,255,255,0.16)',
};

function NPCsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('list');

  const subTabs = [
    { id: 'list', label: 'NPCs & Figures', icon: Users, description: 'People, contacts, recurring faces, allies, rivals, and threats' },
    { id: 'web', label: 'Relationship Web', icon: Network, description: 'Connections, influence, alliances, and tension' },
  ];

  return (
    <section data-testid="npcs-consolidated-tab" style={shellStyle}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>Cast</p>
          <h2 style={titleStyle}>NPCs & Figures</h2>
          <p style={subtitleStyle}>A generic box for specific people and person-like figures. Organisations, governments, gods, and groups belong in Powers & Factions unless the entry is one individual.</p>
        </div>
      </header>

      <section style={ruleStyle}>
        <p style={ruleLabelStyle}>Import rule</p>
        <p style={ruleTextStyle}>Only put individual people here. Places go in Locations. Groups and institutions go in Powers & Factions. Events go in Chronicle.</p>
      </section>

      <nav style={tabsStyle} aria-label="NPC workspace tabs">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} data-testid={`npcs-subtab-${tab.id}`} style={tabButtonStyle(isActive)}>
              <Icon size={18} />
              <span style={{ display: 'grid', gap: 2, textAlign: 'left' }}>
                <strong style={tabLabelStyle}>{tab.label}</strong>
                <span style={tabDescriptionStyle}>{tab.description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <main style={contentStyle}>
        {activeSubTab === 'list' && <NPCsTab campaignId={campaignId} />}
        {activeSubTab === 'web' && <NPCRelationshipWeb campaignId={campaignId} />}
      </main>
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 14, minWidth: 0, fontFamily: fontStack };
const headerStyle = { background: theme.card, border: `1px solid ${theme.border}`, padding: 16 };
const eyebrowStyle = { margin: '0 0 5px', color: theme.muted, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: theme.text, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 };
const subtitleStyle = { margin: '7px 0 0', color: theme.soft, fontSize: 14, lineHeight: 1.45, maxWidth: 840 };
const ruleStyle = { background: theme.panel, borderLeft: `6px solid ${theme.primary}`, padding: 14, display: 'grid', gap: 4 };
const ruleLabelStyle = { margin: 0, color: theme.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 950 };
const ruleTextStyle = { margin: 0, color: theme.soft, lineHeight: 1.45, fontSize: 14 };
const tabsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 0, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` };
const tabButtonStyle = (active) => ({ display: 'flex', alignItems: 'flex-start', gap: 10, minHeight: 66, padding: '12px 14px', background: active ? theme.primary : theme.panel, border: 0, borderRight: `1px solid ${theme.border}`, color: theme.text, cursor: 'pointer', fontFamily: fontStack });
const tabLabelStyle = { color: theme.text, fontSize: 14, fontWeight: 950 };
const tabDescriptionStyle = { color: theme.soft, fontSize: 12, lineHeight: 1.35 };
const contentStyle = { minWidth: 0 };

export default NPCsConsolidatedTab;
