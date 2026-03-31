import React, { useState } from 'react';
import { Globe, Building } from 'lucide-react';
import WorldMapTab from './WorldMapTab';
import LocalMapTab from './LocalMapTab';

// GM Theme - Midnight Neon
const theme = {
  bg: '#0B0B0D',
  panel: 'rgba(15, 10, 30, 0.95)',
  card: 'rgba(15, 10, 30, 0.9)',
  text: '#F8F8FF',
  muted: '#6B7B9B',
  primary: '#8A2BE2',
  border: 'rgba(138, 43, 226, 0.2)',
  gradient: 'linear-gradient(135deg, #4B0082, #8A2BE2)'
};

// Consolidated Maps Tab - World Maps + Local Maps in one view
function MapsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('world');

  const subTabs = [
    { id: 'world', label: 'World Map', icon: Globe, description: 'Overworld, continents, regions' },
    { id: 'local', label: 'Local Maps', icon: Building, description: 'Cities, dungeons, buildings' }
  ];

  return (
    <div data-testid="maps-consolidated-tab" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
              data-testid={`maps-subtab-${tab.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                background: isActive ? theme.gradient : 'transparent',
                border: isActive ? 'none' : `1px solid ${theme.border}`,
                borderRadius: '8px',
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
        {activeSubTab === 'world' && <WorldMapTab campaignId={campaignId} />}
        {activeSubTab === 'local' && <LocalMapTab campaignId={campaignId} />}
      </div>
    </div>
  );
}

export default MapsConsolidatedTab;
