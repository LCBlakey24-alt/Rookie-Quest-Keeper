import React, { useState } from 'react';
import { BookOpen, Dice6, ScrollText } from 'lucide-react';
import QuickReferenceTab from './QuickReferenceTab';
import RandomGeneratorTables from '../RandomGeneratorTables';
import LiveRollTablesPanel from '@/components/gm/LiveRollTablesPanel';

// Theme
const theme = {
  bg: '#0D0D0D',
  panel: '#1A1A1A',
  card: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#808080',
  primary: '#8A2BE2',
  border: 'rgba(255, 255, 255, 0.1)'
};

// Consolidated Tools Tab - campaign tables, rules reference, and random generators in one view
function ToolsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('tables');

  const subTabs = [
    { id: 'tables', label: 'Tables', icon: ScrollText, description: 'Campaign roll & reference tables' },
    { id: 'reference', label: 'Quick Reference', icon: BookOpen, description: 'Rules & lookup tables' },
    { id: 'generators', label: 'Random Generators', icon: Dice6, description: 'Names, loot, etc.' }
  ];

  return (
    <div data-testid="tools-consolidated-tab" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '16px',
        borderBottom: `1px solid ${theme.border}`,
        background: theme.panel,
        flexWrap: 'wrap'
      }}>
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              data-testid={`tools-subtab-${tab.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                background: isActive ? theme.primary : 'transparent',
                border: isActive ? 'none' : `1px solid ${theme.border}`,
                color: isActive ? '#fff' : theme.muted,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={18} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{tab.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{tab.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: activeSubTab === 'tables' ? 16 : 0 }}>
        {activeSubTab === 'tables' && (
          <LiveRollTablesPanel
            campaignId={campaignId}
            allowDisplay={false}
            allowAddNote={false}
            heading="Tables"
            subheading="Build campaign tables here, then use them in Live Play Mode. Add weapons, finesse weapons, potions, shop costs, travel, fate, encounters, rumours, or anything else you want as a quick reference."
          />
        )}
        {activeSubTab === 'reference' && <QuickReferenceTab campaignId={campaignId} />}
        {activeSubTab === 'generators' && <RandomGeneratorTables campaignId={campaignId} />}
      </div>
    </div>
  );
}

export default ToolsConsolidatedTab;
