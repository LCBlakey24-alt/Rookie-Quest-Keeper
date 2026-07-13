import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CloudRain,
  Coins,
  Compass,
  Dices,
  FileText,
  Mail,
  Map,
  Monitor,
  Skull,
  Swords,
  Target,
  UserCircle,
  Users,
} from 'lucide-react';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  hover: '#444444',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.24)',
  red: '#d00000',
  redSoft: 'rgba(208,0,0,0.18)',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
};

export const LIVE_GRID_DEFAULTS = ['overview', 'combat', 'tables', 'player-display'];

export const LIVE_GRID_TOOLS = [
  { id: 'overview', label: 'Run Screen', icon: Target, group: 'Run' },
  { id: 'combat', label: 'Premade Combat', icon: Swords, group: 'Run' },
  { id: 'tables', label: 'Roll Tables', icon: Compass, group: 'Run' },
  { id: 'notes', label: 'Session Notes', icon: FileText, group: 'Run' },
  { id: 'player-display', label: 'Player TV', icon: Monitor, group: 'Run' },
  { id: 'handouts', label: 'Handouts', icon: Mail, group: 'Run' },
  { id: 'party', label: 'Party', icon: Users, group: 'Reference' },
  { id: 'maps', label: 'Maps', icon: Map, group: 'Reference' },
  { id: 'npcs', label: 'NPCs', icon: UserCircle, group: 'Reference' },
  { id: 'environment', label: 'Environment', icon: CloudRain, group: 'Reference' },
  { id: 'reference-hub', label: 'Rules Reference', icon: BookOpen, group: 'Reference' },
  { id: 'quick-dice', label: 'Quick Dice', icon: Dices, group: 'Reference' },
  { id: 'monsters', label: 'Monster Builder', icon: Skull, group: 'Prep' },
  { id: 'loot', label: 'Loot', icon: Coins, group: 'Prep' },
];

const TOOL_GROUPS = [
  { id: 'Run', label: 'Use During Play' },
  { id: 'Reference', label: 'Find Information' },
  { id: 'Prep', label: 'Emergency Prep' },
];

function getStoredTool(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return 'overview';
    const parsed = JSON.parse(raw);
    if (parsed?.activeTool && LIVE_GRID_TOOLS.some(tool => tool.id === parsed.activeTool)) return parsed.activeTool;
  } catch { /* ignore */ }
  return 'overview';
}

export default function LiveSessionGridMode({
  campaignId,
  theme,
  renderTool,
  onOpenSingleTab,
  onRollDice,
  refreshKey = 0,
}) {
  const storageKey = `gm.liveMode.focus.${campaignId || 'default'}`;
  const [activeTool, setActiveTool] = useState(() => getStoredTool(storageKey));
  const [expandedGroups, setExpandedGroups] = useState({ Run: true, Reference: true, Prep: false });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ activeTool })); } catch { /* ignore */ }
  }, [activeTool, storageKey]);

  const active = useMemo(() => LIVE_GRID_TOOLS.find(tool => tool.id === activeTool) || LIVE_GRID_TOOLS[0], [activeTool]);
  const ActiveIcon = active.icon;

  const selectTool = (toolId) => {
    setActiveTool(toolId);
    onOpenSingleTab?.(toolId);
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div data-testid="live-session-grid" style={shellStyle}>
      <aside style={sideBarStyle} aria-label="Live Play tools">
        <div style={sideHeaderStyle}>
          <p style={eyebrowStyle}>Live Tools</p>
          <strong style={sideTitleStyle}>Use, don't build</strong>
        </div>
        {TOOL_GROUPS.map(group => {
          const isExpanded = Boolean(expandedGroups[group.id]);
          const tools = LIVE_GRID_TOOLS.filter(tool => tool.group === group.id);
          return (
            <section key={group.id}>
              <button type="button" onClick={() => toggleGroup(group.id)} style={groupButtonStyle} aria-expanded={isExpanded ? 'true' : 'false'}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{group.label}</span>
              </button>
              {isExpanded && tools.map(tool => {
                const Icon = tool.icon;
                const selected = activeTool === tool.id;
                return (
                  <button key={tool.id} type="button" onClick={() => selectTool(tool.id)} data-testid={`live-tool-${tool.id}`} style={toolButtonStyle(selected)}>
                    <Icon size={16} />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </aside>

      <main style={mainStyle} key={`${refreshKey}-${activeTool}`}>
        <header style={toolHeaderStyle}>
          <div style={toolTitleWrapStyle}>
            <span style={toolIconStyle}><ActiveIcon size={19} /></span>
            <div style={{ minWidth: 0 }}>
              <p style={eyebrowStyle}>{active.group === 'Run' ? 'Live use' : active.group}</p>
              <h2 style={toolTitleStyle}>{active.label}</h2>
            </div>
          </div>
          <span style={modePillStyle}>Focused live mode</span>
        </header>
        <section style={toolBodyStyle}>
          {activeTool === 'overview' ? <LiveOverview onSelect={selectTool} /> : activeTool === 'quick-dice' ? <QuickDicePanel theme={theme} onRollDice={onRollDice} /> : (renderTool?.(activeTool, { compact: false }) || <UtilityPlaceholder title={active.label} text="This live tool is ready." />)}
        </section>
      </main>

      <aside style={quickRailStyle} aria-label="Live quick references">
        <QuickRail onRollDice={onRollDice} onSelect={selectTool} activeTool={activeTool} />
      </aside>
    </div>
  );
}

function LiveOverview({ onSelect }) {
  const cards = [
    { id: 'combat', title: 'Premade Combat', text: 'Open saved encounters and start fights quickly.', icon: Swords },
    { id: 'tables', title: 'Roll Tables', text: 'Roll travel, fey quirks, random encounters, or your own d20 tables.', icon: Compass },
    { id: 'player-display', title: 'Player TV', text: 'Control exactly what the players see on the extended screen.', icon: Monitor },
    { id: 'notes', title: 'Session Notes', text: 'Capture rulings, choices, clues, loot, and consequences.', icon: FileText },
    { id: 'handouts', title: 'Handouts', text: 'Reveal letters, images, clues, secrets, and lore when ready.', icon: Mail },
    { id: 'reference-hub', title: 'Find Rules', text: 'Look up references without leaving live mode.', icon: BookOpen },
  ];
  return (
    <div style={overviewStyle}>
      <section style={overviewHeroStyle}>
        <p style={eyebrowStyle}>Run flow</p>
        <h3 style={overviewTitleStyle}>Live mode is for finding and using your prep.</h3>
        <p style={overviewTextStyle}>Keep creation in prep where possible. During the session, jump to combat, roll tables, notes, handouts, and the player TV display.</p>
      </section>
      <section style={overviewGridStyle}>
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button key={card.id} type="button" onClick={() => onSelect(card.id)} style={overviewCardStyle}>
              <span style={overviewAccentStyle} />
              <span style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                <strong style={overviewCardTitleStyle}><Icon size={17} /> {card.title}</strong>
                <span style={overviewCardTextStyle}>{card.text}</span>
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function QuickRail({ onRollDice, onSelect, activeTool }) {
  return (
    <div style={quickRailInnerStyle}>
      <section style={railBoxStyle}>
        <p style={railLabelStyle}>Quick Dice</p>
        <div style={diceGridStyle}>
          {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
            <button key={die} type="button" onClick={() => onRollDice?.(`1${die}`, die.toUpperCase())} style={diceButtonStyle}>{die.toUpperCase()}</button>
          ))}
        </div>
        <div style={diceGridStyle}>
          <button type="button" onClick={() => onRollDice?.('2d20', 'Two d20s')} style={diceButtonStyle}>2D20</button>
          <button type="button" onClick={() => onRollDice?.('2d6', 'Two d6s')} style={diceButtonStyle}>2D6</button>
        </div>
      </section>

      <section style={railBoxStyle}>
        <p style={railLabelStyle}>Fast Switch</p>
        {[
          ['combat', 'Combat'],
          ['tables', 'Tables'],
          ['notes', 'Notes'],
          ['player-display', 'TV Display'],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => onSelect(id)} style={railLinkStyle(activeTool === id)}>{label}</button>
        ))}
      </section>

      <section style={railBoxStyle}>
        <p style={railLabelStyle}>Table Rule</p>
        <p style={railTextStyle}>Live mode should help you use what already exists: premade combat, notes, roll tables, maps, NPCs, and the player display.</p>
      </section>
    </div>
  );
}

function QuickDicePanel({ onRollDice }) {
  return (
    <div style={standaloneDiceStyle}>
      <p style={overviewTextStyle}>Fast dice rolls without leaving the GM screen. If exploding dice are enabled, non-d20 maximum rolls add another die.</p>
      <div style={largeDiceGridStyle}>
        {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
          <button key={die} type="button" onClick={() => onRollDice?.(`1${die}`, die.toUpperCase())} style={largeDiceButtonStyle}>{die.toUpperCase()}</button>
        ))}
      </div>
    </div>
  );
}

function UtilityPlaceholder({ title, text }) {
  return (
    <div style={placeholderStyle}>
      <Check size={22} style={{ color: rq.red }} />
      <h3 style={{ color: rq.text, margin: '8px 0 4px', fontSize: 16 }}>{title}</h3>
      <p style={{ color: rq.muted, margin: 0, fontSize: 13, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

const shellStyle = { display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 260px', gap: 8, flex: 1, minHeight: 520, overflow: 'visible' };
const sideBarStyle = { background: rq.panel, border: `1px solid ${rq.line}`, minWidth: 0, overflow: 'hidden', alignSelf: 'start', position: 'sticky', top: 8 };
const sideHeaderStyle = { padding: 12, borderBottom: `1px solid ${rq.line}`, background: rq.card };
const eyebrowStyle = { margin: 0, color: rq.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' };
const sideTitleStyle = { display: 'block', marginTop: 3, color: rq.text, fontSize: 17, fontWeight: 950 };
const groupButtonStyle = { width: '100%', minHeight: 38, display: 'flex', alignItems: 'center', gap: 7, border: 0, borderTop: `1px solid ${rq.line}`, background: rq.panel, color: rq.soft, padding: '0 10px', fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', cursor: 'pointer', fontFamily: fontStack };
const toolButtonStyle = (active) => ({ width: '100%', minHeight: 40, display: 'flex', alignItems: 'center', gap: 9, border: 0, borderTop: `1px solid rgba(255,255,255,0.07)`, background: active ? rq.red : 'transparent', color: rq.text, padding: '0 12px 0 28px', fontSize: 13, fontWeight: 900, textAlign: 'left', cursor: 'pointer', fontFamily: fontStack });
const mainStyle = { minWidth: 0, background: rq.panel, border: `1px solid ${rq.line}`, display: 'flex', flexDirection: 'column', overflow: 'visible' };
const toolHeaderStyle = { minHeight: 58, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: `1px solid ${rq.line}`, background: rq.card };
const toolTitleWrapStyle = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 };
const toolIconStyle = { width: 36, height: 36, display: 'grid', placeItems: 'center', background: rq.bg, borderLeft: `5px solid ${rq.red}`, color: rq.text, flex: '0 0 36px' };
const toolTitleStyle = { margin: '2px 0 0', color: rq.text, fontSize: 22, fontWeight: 950, lineHeight: 1.05 };
const modePillStyle = { color: rq.soft, border: `1px solid ${rq.line}`, background: rq.bg, padding: '6px 8px', fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' };
const toolBodyStyle = { padding: 10, minHeight: 0, overflow: 'visible' };
const quickRailStyle = { minWidth: 0, alignSelf: 'start', position: 'sticky', top: 8 };
const quickRailInnerStyle = { display: 'grid', gap: 8 };
const railBoxStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 10 };
const railLabelStyle = { margin: '0 0 8px', color: rq.text, fontSize: 12, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const railTextStyle = { margin: 0, color: rq.soft, fontSize: 12, lineHeight: 1.45 };
const diceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 6 };
const diceButtonStyle = { minHeight: 34, border: `1px solid ${rq.line}`, background: rq.card, color: rq.text, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const railLinkStyle = (active) => ({ width: '100%', minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${active ? rq.red : rq.line}`, background: active ? rq.redSoft : rq.card, color: rq.text, padding: '0 9px', marginTop: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack });
const overviewStyle = { display: 'grid', gap: 12 };
const overviewHeroStyle = { background: rq.bg, border: `1px solid ${rq.line}`, padding: 14 };
const overviewTitleStyle = { margin: '4px 0 6px', color: rq.text, fontSize: 26, fontWeight: 950, lineHeight: 1.05 };
const overviewTextStyle = { margin: 0, color: rq.soft, fontSize: 13, lineHeight: 1.5 };
const overviewGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 };
const overviewCardStyle = { minHeight: 112, display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left', border: `1px solid ${rq.line}`, background: rq.card, color: rq.text, padding: 12, cursor: 'pointer', fontFamily: fontStack };
const overviewAccentStyle = { width: 5, height: 42, background: rq.red, flex: '0 0 auto' };
const overviewCardTitleStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, color: rq.text, fontSize: 15, fontWeight: 950 };
const overviewCardTextStyle = { color: rq.soft, fontSize: 12, lineHeight: 1.45 };
const standaloneDiceStyle = { display: 'grid', gap: 14, background: rq.bg, border: `1px solid ${rq.line}`, padding: 14 };
const largeDiceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 };
const largeDiceButtonStyle = { minHeight: 60, border: `1px solid ${rq.lineStrong}`, background: rq.card, color: rq.text, fontSize: 16, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const placeholderStyle = { minHeight: 220, display: 'grid', placeItems: 'center', alignContent: 'center', textAlign: 'center', background: rq.bg, border: `1px dashed ${rq.line}`, padding: 20 };

if (typeof document !== 'undefined' && !document.getElementById('live-session-focused-layout-css')) {
  const style = document.createElement('style');
  style.id = 'live-session-focused-layout-css';
  style.textContent = `
    @media (max-width: 1180px) {
      [data-testid="live-session-grid"] {
        grid-template-columns: 190px minmax(0, 1fr) !important;
      }
      [data-testid="live-session-grid"] > aside:last-child {
        display: none !important;
      }
    }
    @media (max-width: 780px) {
      [data-testid="live-session-grid"] {
        display: flex !important;
        flex-direction: column !important;
      }
      [data-testid="live-session-grid"] > aside:first-child {
        position: static !important;
      }
    }
  `;
  document.head.appendChild(style);
}