import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import CalendarTab from './CalendarTab';
import SessionTimeline from '../SessionTimeline';

// Theme
const theme = {
  bg: '#0D0D0D',
  panel: '#1A1A1A',
  card: '#1F1F1F',
  text: '#FFFFFF',
  muted: '#808080',
  primary: '#E11D48',
  border: 'rgba(255, 255, 255, 0.1)'
};

// Consolidated Chronicle Tab - Calendar + Session Timeline in one view
function ChronicleConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('timeline');

  const subTabs = [
    { id: 'timeline', label: 'Session Timeline', icon: Clock, description: 'Session history & events' },
    { id: 'calendar', label: 'In-Game Calendar', icon: Calendar, description: 'Track in-world time' }
  ];

  return (
    <div data-testid="chronicle-consolidated-tab" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
              data-testid={`chronicle-subtab-${tab.id}`}
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
        {activeSubTab === 'timeline' && <SessionTimeline campaignId={campaignId} />}
        {activeSubTab === 'calendar' && <CalendarTab campaignId={campaignId} />}
      </div>
    </div>
  );
}

export default ChronicleConsolidatedTab;
