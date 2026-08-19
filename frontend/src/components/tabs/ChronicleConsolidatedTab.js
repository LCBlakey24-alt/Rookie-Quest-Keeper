import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import CalendarTab from './CalendarTab';
import SessionTimeline from '../SessionTimeline';

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const theme = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', text: '#ffffff',
  primary: '#d00000', border: 'rgba(255,255,255,0.16)',
};

function ChronicleConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('timeline');
  const subTabs = [
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  return (
    <section data-testid="chronicle-consolidated-tab" style={shellStyle}>
      <nav style={tabsStyle} aria-label="Timeline and calendar tools">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} data-testid={`chronicle-subtab-${tab.id}`} style={tabButtonStyle(active)}>
              <Icon size={16} />
              <strong>{tab.label}</strong>
            </button>
          );
        })}
      </nav>

      <main style={contentStyle}>
        {activeSubTab === 'timeline' && <SessionTimeline campaignId={campaignId} />}
        {activeSubTab === 'calendar' && <CalendarTab campaignId={campaignId} />}
      </main>
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 8, minWidth: 0, fontFamily: fontStack };
const tabsStyle = { display: 'flex', gap: 1, overflowX: 'auto', background: theme.border, border: `1px solid ${theme.border}` };
const tabButtonStyle = active => ({ minWidth: 118, minHeight: 44, padding: '0 11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: active ? theme.primary : theme.card, border: 0, color: theme.text, cursor: 'pointer', fontFamily: fontStack, whiteSpace: 'nowrap' });
const contentStyle = { minWidth: 0, background: theme.bg };

export default ChronicleConsolidatedTab;
