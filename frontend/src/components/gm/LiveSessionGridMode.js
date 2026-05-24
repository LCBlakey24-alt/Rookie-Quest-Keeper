import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Check,
  CloudRain,
  Coins,
  Compass,
  Dices,
  FileText,
  Grid3X3,
  Link2,
  Music,
  RefreshCw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  UserCircle,
  Users,
  Volume2,
  Wand2,
} from 'lucide-react';

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  elevated: 'var(--rq-bg-elevated, #323232)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

export const LIVE_GRID_DEFAULTS = ['combat', 'party', 'notes', 'npcs', 'reference-hub', 'environment'];

export const LIVE_GRID_TOOLS = [
  { id: 'combat', label: 'Combat', icon: Swords, group: 'Core' },
  { id: 'party', label: 'Party', icon: Users, group: 'Core' },
  { id: 'notes', label: 'Notes', icon: FileText, group: 'Core' },
  { id: 'npcs', label: 'NPCs', icon: UserCircle, group: 'Characters' },
  { id: 'monsters', label: 'Monsters', icon: Skull, group: 'Characters' },
  { id: 'network', label: 'NPC Network', icon: Link2, group: 'Characters' },
  { id: 'location', label: 'Location', icon: Compass, group: 'World' },
  { id: 'environment', label: 'Environment', icon: CloudRain, group: 'World' },
  { id: 'events', label: 'Events', icon: BarChart3, group: 'World' },
  { id: 'reference-hub', label: 'Reference', icon: BookOpen, group: 'Reference' },
  { id: 'tables', label: 'Random Tables', icon: Wand2, group: 'Reference' },
  { id: 'loot', label: 'Loot', icon: Coins, group: 'Reference' },
  { id: 'story', label: 'Story Arcs', icon: Target, group: 'Session' },
  { id: 'planner', label: 'Rook Planner', icon: Sparkles, group: 'Session' },
  { id: 'sound', label: 'Soundboard', icon: Volume2, group: 'Session' },
  { id: 'quick-dice', label: 'Quick Dice', icon: Dices, group: 'Utility' },
  { id: 'timer', label: 'Session Timer', icon: Shield, group: 'Utility' },
  { id: 'sound-mini', label: 'Audio Cue', icon: Music, group: 'Utility' },
];

function getDefaultPanelCount() {
  if (typeof window === 'undefined') return 6;
  if (window.matchMedia('(max-width: 640px)').matches) return 1;
  if (window.matchMedia('(max-width: 1100px)').matches) return 4;
  return 6;
}

function getStoredLayout(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.panels)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function LiveSessionGridMode({
  campaignId,
  theme,
  renderTool,
  onOpenSingleTab,
  onRollDice,
}) {
  const storageKey = `gm.liveGrid.layout.${campaignId || 'default'}`;
  const stored = useMemo(() => getStoredLayout(storageKey), [storageKey]);
  const [panelCount, setPanelCount] = useState(stored?.panelCount || getDefaultPanelCount());
  const [panels, setPanels] = useState(stored?.panels || LIVE_GRID_DEFAULTS);

  useEffect(() => {
    const next = { panelCount, panels };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  }, [panelCount, panels, storageKey]);

  const visiblePanels = useMemo(() => {
    const next = [...panels];
    while (next.length < panelCount) next.push(LIVE_GRID_DEFAULTS[next.length % LIVE_GRID_DEFAULTS.length]);
    return next.slice(0, panelCount);
  }, [panelCount, panels]);

  const setPanelTool = (index, toolId) => {
    setPanels(prev => {
      const next = [...prev];
      while (next.length <= index) next.push(LIVE_GRID_DEFAULTS[next.length % LIVE_GRID_DEFAULTS.length]);
      next[index] = toolId;
      return next;
    });
  };

  const resetLayout = () => {
    const count = getDefaultPanelCount();
    setPanelCount(count);
    setPanels(LIVE_GRID_DEFAULTS);
  };

  const gridStyle = getGridStyle(panelCount);

  return (
    <div data-testid="live-session-grid" style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: '100%' }}>
      <div style={toolbarStyle}>
        <div style={{ minWidth: 0 }}>
          <h2 style={titleStyle}><Grid3X3 size={22} /> GM Screen</h2>
          <p style={subtitleStyle}>Choose 1–6 panels and keep your core live-session tools open at the same time.</p>
        </div>
        <div style={toolbarActionsStyle}>
          <div style={countPickerStyle} aria-label="Panel count selector">
            {[1, 2, 3, 4, 5, 6].map(count => {
              const active = panelCount === count;
              return (
                <button key={count} type="button" data-testid={`live-grid-count-${count}`} onClick={() => setPanelCount(count)} style={countButtonStyle(active)}>
                  {count}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={resetLayout} style={resetButtonStyle}>
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      <div style={gridStyle}>
        {visiblePanels.map((toolId, index) => {
          const tool = LIVE_GRID_TOOLS.find(item => item.id === toolId) || LIVE_GRID_TOOLS[0];
          const Icon = tool.icon;
          return (
            <section key={`${index}-${toolId}`} data-testid={`live-grid-panel-${index + 1}`} style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div style={panelTitleStyle}>
                  <Icon size={15} style={{ color: rq.accentHover }} />
                  <span>Panel {index + 1}</span>
                </div>
                <select
                  value={toolId}
                  onChange={event => setPanelTool(index, event.target.value)}
                  style={selectStyle}
                  aria-label={`Choose tool for panel ${index + 1}`}
                >
                  {LIVE_GRID_TOOLS.map(option => (
                    <option key={option.id} value={option.id}>{option.group} · {option.label}</option>
                  ))}
                </select>
              </div>
              <div style={panelBodyStyle}>
                {toolId === 'quick-dice' ? (
                  <QuickDicePanel theme={theme} onRollDice={onRollDice} />
                ) : toolId === 'timer' ? (
                  <UtilityPlaceholder title="Session Timer" text="Use this slot for live session timing. Full timer controls can be expanded in a future pass." />
                ) : toolId === 'sound-mini' ? (
                  <UtilityPlaceholder title="Audio Cue" text="Use this slot for fast sound cues. Full soundboard is available as a panel too." />
                ) : (
                  <GridToolWrapper toolId={toolId} onOpenSingleTab={onOpenSingleTab}>
                    {renderTool?.(toolId, { compact: true }) || <UtilityPlaceholder title={tool.label} text="This panel is ready for this tool." />}
                  </GridToolWrapper>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function GridToolWrapper({ toolId, onOpenSingleTab, children }) {
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button type="button" onClick={() => onOpenSingleTab?.(toolId)} style={openButtonStyle}>Focus Tool</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
    </div>
  );
}

function QuickDicePanel({ onRollDice }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ color: rq.muted, fontSize: 12, margin: 0 }}>Fast dice rolls without leaving the GM screen.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
          <button key={die} type="button" onClick={() => onRollDice?.(`1${die}`, die.toUpperCase())} style={diceButtonStyle}>{die.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <button type="button" onClick={() => onRollDice?.('2d20', 'Adv/Dis check')} style={diceButtonStyle}>2D20</button>
        <button type="button" onClick={() => onRollDice?.('2d6', 'Damage')} style={diceButtonStyle}>2D6</button>
      </div>
    </div>
  );
}

function UtilityPlaceholder({ title, text }) {
  return (
    <div style={placeholderStyle}>
      <Check size={22} style={{ color: rq.accentHover }} />
      <h3 style={{ color: rq.text, margin: '8px 0 4px', fontSize: 15 }}>{title}</h3>
      <p style={{ color: rq.muted, margin: 0, fontSize: 12, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function getGridStyle(panelCount) {
  const base = {
    display: 'grid',
    gap: 10,
    flex: 1,
    minHeight: 0,
  };
  if (panelCount === 1) return { ...base, gridTemplateColumns: '1fr' };
  if (panelCount === 2) return { ...base, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' };
  if (panelCount === 3) return { ...base, gridTemplateColumns: '1.25fr repeat(2, minmax(0, 1fr))' };
  if (panelCount === 4) return { ...base, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' };
  if (panelCount === 5) return { ...base, gridTemplateColumns: '1.2fr repeat(2, minmax(0, 1fr))' };
  return { ...base, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' };
}

const toolbarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: 0, padding: 12 };
const titleStyle = { color: rq.text, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 9, margin: 0 };
const subtitleStyle = { color: rq.muted, fontSize: 12, margin: '5px 0 0' };
const toolbarActionsStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const countPickerStyle = { display: 'flex', border: `1px solid ${rq.border}`, background: rq.input, borderRadius: 0, overflow: 'hidden' };
const countButtonStyle = (active) => ({ minWidth: 34, height: 34, border: 'none', borderRight: `1px solid ${rq.borderDefault}`, background: active ? rq.accent : 'transparent', color: active ? '#FFFFFF' : rq.textSecondary, fontWeight: 900, cursor: 'pointer' });
const resetButtonStyle = { minHeight: 36, display: 'inline-flex', alignItems: 'center', gap: 7, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '0 11px', borderRadius: 0, fontWeight: 900, cursor: 'pointer' };
const panelStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: 0, minHeight: 220, height: 'minmax(220px, 1fr)', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const panelHeaderStyle = { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', padding: '8px 10px', borderBottom: `1px solid ${rq.border}`, background: rq.input };
const panelTitleStyle = { color: rq.text, fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' };
const selectStyle = { minWidth: 130, maxWidth: '58%', background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: 0, padding: '6px 8px', fontSize: 11, outline: 'none' };
const panelBodyStyle = { flex: 1, minHeight: 0, overflow: 'auto', padding: 10 };
const openButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.accentHover, padding: '5px 8px', borderRadius: 0, fontSize: 10, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' };
const diceButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, minHeight: 42, borderRadius: 0, fontWeight: 900, cursor: 'pointer' };
const placeholderStyle = { height: '100%', minHeight: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: rq.input, border: `1px dashed ${rq.borderDefault}`, padding: 16 };
