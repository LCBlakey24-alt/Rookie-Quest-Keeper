import React, { useState } from 'react';
import { Building, Globe, MapPin, Route } from 'lucide-react';
import WorldMapTab from './WorldMapTab';
import LocalMapTab from './LocalMapTab';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
  line: 'rgba(255,255,255,0.16)',
};

function MapsConsolidatedTab({ campaignId }) {
  const [activeSubTab, setActiveSubTab] = useState('world');

  const subTabs = [
    {
      id: 'world',
      label: 'World Maps',
      icon: Globe,
      description: 'Start with the big map and place locations as pins.',
    },
    {
      id: 'local',
      label: 'Location Maps',
      icon: Building,
      description: 'Open a city, dungeon, base, or region and place points of interest.',
    },
  ];

  return (
    <section data-testid="maps-consolidated-tab" style={shellStyle}>
      <header style={heroStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>World Atlas</p>
          <h2 style={titleStyle}>Maps first, locations inside them</h2>
          <p style={subtitleStyle}>Build the world from the map outward: upload a world or region map, drop location markers onto it, then open local maps to add points of interest.</p>
        </div>
        <div style={flowStyle}>
          <FlowChip icon={Globe} label="World map" />
          <span style={arrowStyle}>→</span>
          <FlowChip icon={MapPin} label="Location pins" />
          <span style={arrowStyle}>→</span>
          <FlowChip icon={Building} label="Local map" />
          <span style={arrowStyle}>→</span>
          <FlowChip icon={Route} label="Points of interest" />
        </div>
      </header>

      <nav style={subTabBarStyle} aria-label="World atlas tools">
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
              <Icon size={18} />
              <span style={{ textAlign: 'left', minWidth: 0 }}>
                <strong style={subTabTitleStyle}>{tab.label}</strong>
                <small style={subTabDescStyle}>{tab.description}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <section style={contentStyle}>
        {activeSubTab === 'world' && <WorldMapTab campaignId={campaignId} />}
        {activeSubTab === 'local' && <LocalMapTab campaignId={campaignId} />}
      </section>
    </section>
  );
}

function FlowChip({ icon: Icon, label }) {
  return <span style={flowChipStyle}><Icon size={15} /> {label}</span>;
}

const shellStyle = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, color: rq.text, fontFamily: fontStack };
const heroStyle = { display: 'grid', gap: 12, background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `7px solid ${rq.red}`, padding: 14 };
const eyebrowStyle = { margin: '0 0 5px', color: rq.red, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.11em' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 'clamp(34px, 5vw, 58px)', lineHeight: 0.95 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, lineHeight: 1.45, maxWidth: 880 };
const flowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const flowChipStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 32, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 9px', fontSize: 12, fontWeight: 900 };
const arrowStyle = { color: rq.red, fontWeight: 950 };
const subTabBarStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 };
const subTabStyle = (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: active ? rq.red : rq.card, border: `1px solid ${active ? rq.red : rq.line}`, color: rq.text, cursor: 'pointer', fontFamily: fontStack, textAlign: 'left' });
const subTabTitleStyle = { display: 'block', fontWeight: 950, fontSize: 14 };
const subTabDescStyle = { display: 'block', color: rq.soft, fontSize: 11, lineHeight: 1.3, marginTop: 2 };
const contentStyle = { flex: 1, overflow: 'auto', background: rq.panel, border: `1px solid ${rq.line}`, minHeight: 520 };

export default MapsConsolidatedTab;
