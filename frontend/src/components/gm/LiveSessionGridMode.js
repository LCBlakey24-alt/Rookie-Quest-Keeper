import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Coins, Compass, Dices, FileText, Mail, Map, Monitor, MoreHorizontal, Swords, Target, UserCircle, Users } from 'lucide-react';
import LiveEncounterLauncher from './LiveEncounterLauncher';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', hover: '#444444', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};

export const LIVE_GRID_DEFAULTS = ['overview', 'story', 'combat', 'notes'];

export const LIVE_GRID_TOOLS = [
  { id: 'overview', label: 'Run', icon: Target, primary: true },
  { id: 'story', label: 'Quests', icon: BookOpen, primary: true },
  { id: 'combat', label: 'Encounters', icon: Swords, primary: true },
  { id: 'npcs', label: 'NPCs', icon: UserCircle, primary: true },
  { id: 'notes', label: 'Notes', icon: FileText, primary: true },
  { id: 'more', label: 'More', icon: MoreHorizontal, primary: true },
  { id: 'party', label: 'Party', icon: Users },
  { id: 'maps', label: 'Maps', icon: Map },
  { id: 'handouts', label: 'Handouts', icon: Mail },
  { id: 'tables', label: 'Roll Tables', icon: Compass },
  { id: 'reference-hub', label: 'Rules', icon: BookOpen },
  { id: 'quick-dice', label: 'Dice', icon: Dices },
  { id: 'loot', label: 'Loot', icon: Coins },
  { id: 'player-display', label: 'Player Display', icon: Monitor },
];

const SECONDARY_IDS = new Set(LIVE_GRID_TOOLS.filter(tool => !tool.primary).map(tool => tool.id));

function readStoredTool(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (parsed.activeTool && LIVE_GRID_TOOLS.some(tool => tool.id === parsed.activeTool)) return parsed.activeTool;
  } catch { /* ignore */ }
  return 'overview';
}

export default function LiveSessionGridMode({ campaignId, renderTool, onOpenSingleTab, onRollDice, refreshKey = 0 }) {
  const storageKey = `gm.liveMode.focus.${campaignId || 'default'}`;
  const recentKey = `gm.liveMode.recent.${campaignId || 'default'}`;
  const [activeTool, setActiveTool] = useState(() => readStoredTool(storageKey));
  const [recentTools, setRecentTools] = useState(() => {
    try { return JSON.parse(localStorage.getItem(recentKey) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ activeTool })); } catch { /* ignore */ }
  }, [activeTool, storageKey]);

  useEffect(() => {
    try { localStorage.setItem(recentKey, JSON.stringify(recentTools)); } catch { /* ignore */ }
  }, [recentKey, recentTools]);

  const active = useMemo(() => LIVE_GRID_TOOLS.find(tool => tool.id === activeTool) || LIVE_GRID_TOOLS[0], [activeTool]);
  const primaryActiveId = SECONDARY_IDS.has(activeTool) ? 'more' : activeTool;
  const ActiveIcon = active.icon;

  const selectTool = (toolId) => {
    setActiveTool(toolId);
    if (!['overview', 'more'].includes(toolId)) {
      setRecentTools(prev => [toolId, ...prev.filter(id => id !== toolId)].slice(0, 4));
    }
    onOpenSingleTab?.(toolId);
  };

  return (
    <div data-testid="live-session-grid" style={shellStyle}>
      <nav style={primaryNavStyle} aria-label="Live Play">
        {LIVE_GRID_TOOLS.filter(tool => tool.primary).map(tool => {
          const Icon = tool.icon;
          const selected = primaryActiveId === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => selectTool(tool.id)}
              data-testid={`live-tool-${tool.id}`}
              style={navButtonStyle(selected)}
            >
              <Icon size={17} />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </nav>

      <main style={mainStyle} key={`${refreshKey}-${activeTool}`}>
        {activeTool !== 'overview' && activeTool !== 'more' && (
          <header style={toolHeaderStyle}>
            <div style={toolTitleStyle}><ActiveIcon size={18} /><strong>{active.label}</strong></div>
            <span style={livePillStyle}>Live Play</span>
          </header>
        )}
        <section style={toolBodyStyle}>
          {activeTool === 'overview' ? (
            <RunScreen recentTools={recentTools} onSelect={selectTool} />
          ) : activeTool === 'more' ? (
            <MorePanel onSelect={selectTool} />
          ) : activeTool === 'combat' ? (
            <LiveEncounterLauncher campaignId={campaignId} />
          ) : activeTool === 'quick-dice' ? (
            <QuickDicePanel onRollDice={onRollDice} />
          ) : (
            renderTool?.(activeTool, { compact: false }) || <EmptyTool title={active.label} />
          )}
        </section>
      </main>
    </div>
  );
}

function RunScreen({ recentTools, onSelect }) {
  const core = [
    { id: 'story', label: 'Quests', icon: BookOpen, detail: 'Open, tick off, continue' },
    { id: 'combat', label: 'Encounters', icon: Swords, detail: 'Run prepared combat' },
    { id: 'npcs', label: 'NPCs', icon: UserCircle, detail: 'Find people fast' },
    { id: 'notes', label: 'Quick Notes', icon: FileText, detail: 'Record what changed' },
  ];
  const recent = recentTools.map(id => LIVE_GRID_TOOLS.find(tool => tool.id === id)).filter(Boolean);

  return (
    <div style={runScreenStyle}>
      <header style={runHeaderStyle}>
        <p style={eyebrowStyle}>Live Play</p>
        <h2 style={runTitleStyle}>What do you need?</h2>
      </header>

      <section style={coreGridStyle}>
        {core.map(item => {
          const Icon = item.icon;
          return <button key={item.id} type="button" onClick={() => onSelect(item.id)} style={coreCardStyle}><Icon size={21} /><strong>{item.label}</strong><span>{item.detail}</span></button>;
        })}
      </section>

      {recent.length > 0 && (
        <section style={recentStyle}>
          <p style={sectionLabelStyle}>Recent</p>
          <div style={recentRowStyle}>{recent.map(tool => { const Icon = tool.icon; return <button key={tool.id} type="button" onClick={() => onSelect(tool.id)} style={recentButtonStyle}><Icon size={14} /> {tool.label}</button>; })}</div>
        </section>
      )}

      <section style={quickStripStyle}>
        <button type="button" onClick={() => onSelect('quick-dice')} style={quickButtonStyle}><Dices size={15} /> Dice</button>
        <button type="button" onClick={() => onSelect('maps')} style={quickButtonStyle}><Map size={15} /> Maps</button>
        <button type="button" onClick={() => onSelect('handouts')} style={quickButtonStyle}><Mail size={15} /> Handouts</button>
        <button type="button" onClick={() => onSelect('reference-hub')} style={quickButtonStyle}><BookOpen size={15} /> Rules</button>
      </section>
    </div>
  );
}

function MorePanel({ onSelect }) {
  const tools = LIVE_GRID_TOOLS.filter(tool => !tool.primary);
  return (
    <div style={moreStyle}>
      <header style={runHeaderStyle}><p style={eyebrowStyle}>More Tools</p><h2 style={runTitleStyle}>Everything else</h2></header>
      <div style={moreGridStyle}>
        {tools.map(tool => {
          const Icon = tool.icon;
          return <button key={tool.id} type="button" onClick={() => onSelect(tool.id)} data-testid={`live-tool-${tool.id}`} style={moreButtonStyle}><Icon size={18} /><strong>{tool.label}</strong></button>;
        })}
      </div>
    </div>
  );
}

function QuickDicePanel({ onRollDice }) {
  return (
    <div style={dicePanelStyle}>
      <h3 style={{ margin: 0, color: rq.text }}>Quick Dice</h3>
      <div style={diceGridStyle}>
        {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => <button key={die} type="button" onClick={() => onRollDice?.(`1${die}`, die.toUpperCase())} style={diceButtonStyle}>{die.toUpperCase()}</button>)}
      </div>
    </div>
  );
}

function EmptyTool({ title }) {
  return <div style={emptyStyle}><strong>{title}</strong><span>This tool is available from Live Play.</span></div>;
}

const shellStyle = { display: 'grid', gap: 8, minWidth: 0, fontFamily: fontStack };
const primaryNavStyle = { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(92px, 1fr))', gap: 1, background: rq.line, border: `1px solid ${rq.line}`, overflowX: 'auto' };
const navButtonStyle = (active) => ({ minWidth: 92, minHeight: 52, border: 0, background: active ? rq.red : rq.panel, color: rq.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontWeight: 950, fontSize: 12, fontFamily: fontStack, whiteSpace: 'nowrap' });
const mainStyle = { minWidth: 0, background: rq.panel, border: `1px solid ${rq.line}` };
const toolHeaderStyle = { minHeight: 48, padding: '0 11px', borderBottom: `1px solid ${rq.line}`, background: rq.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
const toolTitleStyle = { display: 'flex', alignItems: 'center', gap: 7, color: rq.text, fontSize: 15 };
const livePillStyle = { padding: '4px 7px', background: rq.bg, color: rq.muted, border: `1px solid ${rq.line}`, fontSize: 9, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase' };
const toolBodyStyle = { padding: 8, minWidth: 0 };
const runScreenStyle = { display: 'grid', gap: 10 };
const runHeaderStyle = { padding: '10px 4px 3px' };
const eyebrowStyle = { margin: 0, color: rq.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const runTitleStyle = { margin: '2px 0 0', color: rq.text, fontSize: 'clamp(24px, 4vw, 38px)', lineHeight: 1, fontWeight: 950 };
const coreGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 7 };
const coreCardStyle = { minHeight: 104, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${rq.red}`, background: rq.card, color: rq.text, padding: 12, display: 'grid', justifyItems: 'start', alignContent: 'center', gap: 5, textAlign: 'left', cursor: 'pointer', fontFamily: fontStack };
const recentStyle = { display: 'grid', gap: 6, paddingTop: 2 };
const sectionLabelStyle = { margin: 0, color: rq.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.09em' };
const recentRowStyle = { display: 'flex', gap: 5, flexWrap: 'wrap' };
const recentButtonStyle = { minHeight: 31, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.soft, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: fontStack, fontSize: 11, fontWeight: 850 };
const quickStripStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(90px, 1fr))', gap: 5, overflowX: 'auto' };
const quickButtonStyle = { minWidth: 90, minHeight: 36, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontWeight: 900, fontFamily: fontStack, fontSize: 11 };
const moreStyle = { display: 'grid', gap: 10 };
const moreGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 7 };
const moreButtonStyle = { minHeight: 62, border: `1px solid ${rq.line}`, background: rq.card, color: rq.text, padding: 10, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const dicePanelStyle = { display: 'grid', gap: 10, padding: 6 };
const diceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(72px, 1fr))', gap: 7 };
const diceButtonStyle = { minHeight: 52, border: `1px solid ${rq.line}`, background: rq.card, color: rq.text, cursor: 'pointer', fontSize: 14, fontWeight: 950 };
const emptyStyle = { minHeight: 150, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 5, color: rq.muted, textAlign: 'center' };
