import React, { useState } from 'react';
import { BookOpen, Dice6, ScrollText } from 'lucide-react';
import QuickReferenceTab from './QuickReferenceTab';
import RandomGeneratorTables from '../RandomGeneratorTables';
import LiveRollTablesPanel from '@/components/gm/LiveRollTablesPanel';

const theme = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', text: '#ffffff',
  primary: '#d00000', border: 'rgba(255,255,255,0.16)'
};

function ToolsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('tables');
  const subTabs = [
    { id: 'tables', label: 'Tables', icon: ScrollText },
    { id: 'reference', label: 'Quick Reference', icon: BookOpen },
    { id: 'generators', label: 'Generators', icon: Dice6 },
  ];

  return (
    <div data-testid="tools-consolidated-tab" style={shellStyle}>
      <nav style={tabsStyle} aria-label="Reference tools">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => setActiveSubTab(tab.id)} data-testid={`tools-subtab-${tab.id}`} style={tabStyle(active)}>
              <Icon size={16} /> <strong>{tab.label}</strong>
            </button>
          );
        })}
      </nav>
      <div style={{ flex: 1, overflow: 'auto', padding: activeSubTab === 'tables' ? 8 : 0, minWidth: 0 }}>
        {activeSubTab === 'tables' && (
          <LiveRollTablesPanel campaignId={campaignId} allowDisplay={false} allowAddNote={false} heading="Tables" subheading="Build reusable campaign tables here." />
        )}
        {activeSubTab === 'reference' && <QuickReferenceTab campaignId={campaignId} />}
        {activeSubTab === 'generators' && <RandomGeneratorTables campaignId={campaignId} />}
      </div>
    </div>
  );
}

const shellStyle = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: theme.text, background: theme.bg };
const tabsStyle = { display: 'flex', gap: 1, overflowX: 'auto', background: theme.border, border: `1px solid ${theme.border}` };
const tabStyle = active => ({ minWidth: 120, minHeight: 44, border: 0, background: active ? theme.primary : theme.card, color: theme.text, padding: '0 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' });

export default ToolsConsolidatedTab;
