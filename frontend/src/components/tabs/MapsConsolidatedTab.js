import React, { useState } from 'react';
import { Building, Globe, Map as MapIcon, MapPin } from 'lucide-react';
import WorldMapTab from './WorldMapTab';
import LocalMapTab from './LocalMapTab';
import LocationsTab from './LocationsTab';
import MapsTab from './MapsTab';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  line: 'rgba(255,255,255,0.16)',
};

function MapsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('world');

  const subTabs = [
    { id: 'world', label: 'World Map', icon: Globe },
    { id: 'local', label: 'Town & City Maps', icon: Building },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'battle', label: 'Battle Maps', icon: MapIcon },
  ];

  return (
    <section data-testid="maps-consolidated-tab" style={shellStyle}>
      <nav style={subTabBarStyle} aria-label="Map and location tools">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              data-testid={`maps-subtab-${tab.id}`}
              style={subTabStyle(isActive)}
            >
              <Icon size={17} />
              <strong>{tab.label}</strong>
            </button>
          );
        })}
      </nav>

      <section style={contentStyle}>
        {activeSubTab === 'world' && <WorldMapTab campaignId={campaignId} />}
        {activeSubTab === 'local' && <LocalMapTab campaignId={campaignId} />}
        {activeSubTab === 'locations' && <LocationsTab campaignId={campaignId} />}
        {activeSubTab === 'battle' && <MapsTab campaignId={campaignId} />}
      </section>
    </section>
  );
}

const shellStyle = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: rq.text, fontFamily: fontStack, minWidth: 0 };
const subTabBarStyle = { display: 'flex', gap: 1, overflowX: 'auto', background: rq.line, border: `1px solid ${rq.line}` };
const subTabStyle = active => ({ minWidth: 128, minHeight: 44, border: 0, background: active ? rq.red : rq.card, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontFamily: fontStack, whiteSpace: 'nowrap' });
const contentStyle = { flex: 1, overflow: 'auto', background: rq.panel, border: `1px solid ${rq.line}`, minHeight: 520, minWidth: 0 };

export default MapsConsolidatedTab;
