import React, { useState } from 'react';
import { BookOpen, Dice6 } from 'lucide-react';
import QuickReferenceTab from './QuickReferenceTab';
import RandomGeneratorTables from '../RandomGeneratorTables';

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

// Consolidated Tools Tab - Quick Reference + Random Generators in one view
function ToolsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('reference');

  const subTabs = [
    { id: 'reference', label: 'Quick Reference', icon: BookOpen, description: 'Rules & tables' },
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
        background: theme.panel
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
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeSubTab === 'reference' && <QuickReferenceTab campaignId={campaignId} />}
        {activeSubTab === 'generators' && <RandomGeneratorTables campaignId={campaignId} />}
      </div>
    </div>
  );
}

export default ToolsConsolidatedTab;
