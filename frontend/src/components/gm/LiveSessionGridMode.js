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
  Mail,
  RefreshCw,
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
  panel: 'var(--rq-bg-panel, #21150E)',
  input: 'var(--rq-bg-input, #1A100B)',
  elevated: 'var(--rq-bg-elevated, #3A2619)',
  border: 'var(--rq-accent-border, rgba(192,138,61,0.42))',
  borderDefault: 'var(--rq-border-default, rgba(192,138,61,0.22))',
  accent: 'var(--rq-accent-primary, #C08A3D)',
  accentHover: 'var(--rq-accent-hover, #E0B15C)',
  accentSoft: 'var(--rq-accent-soft, rgba(192,138,61,0.12))',
  text: 'var(--rq-text-primary, #F5E6C8)',
  textSecondary: 'var(--rq-text-secondary, #E6D2AA)',
  muted: 'var(--rq-text-muted, #CDBA98)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

export const LIVE_GRID_DEFAULTS = ['combat', 'party', 'notes', 'handouts'];

export const LIVE_GRID_TOOLS = [
  { id: 'combat', label: 'Combat', icon: Swords, group: 'Core' },
  { id: 'party', label: 'Party', icon: Users, group: 'Core' },
  { id: 'notes', label: 'Notes', icon: FileText, group: 'Core' },
  { id: 'handouts', label: 'Handouts', icon: Mail, group: 'Core' },
  { id: 'quick-dice', label: 'Quick Dice', icon: Dices, group: 'Core' },
  { id: 'reference-hub', label: 'Reference', icon: BookOpen, group: 'Core' },
  { id: 'npcs', label: 'NPCs', icon: UserCircle, group: 'Characters' },
  { id: 'monsters', label: 'Monsters', icon: Skull, group: 'Characters' },
  { id: 'network', label: 'NPC Network', icon: Link2, group: 'Characters' },
  { id: 'location', label: 'Location', icon: Compass, group: 'World' },
  { id: 'environment', label: 'Environment', icon: CloudRain, group: 'World' },
  { id: 'events', label: 'Events', icon: BarChart3, group: 'World' },
  { id: 'tables', label: 'Random Tables', icon: Wand2, group: 'Reference' },
  { id: 'loot', label: 'Loot', icon: Coins, group: 'Reference' },
  { id: 'story', label: 'Story Arcs', icon: Target, group: 'Session' },
  { id: 'planner', label: 'Rook Planner', icon: Sparkles, group: 'Session' },
  { id: 'sound', label: 'Soundboard', icon: Volume2, group: 'Session' },
];

function getDefaultPanelCount() {
  if (typeof window === 'undefined') return 4;
  if (window.matchMedia('(max-width: 640px)').matches) return 1;
  if (window.matchMedia('(max-width: 1100px)').matches) return 2;
  return 4;
}

function getStoredLayout(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.panels)) return null;
    const allowed = new Set(LIVE_GRID_TOOLS.map(tool => tool.id));
    return {
      panelCount: Math.min(4, Math.max(1, Number(parsed.panelCount) || getDefaultPanelCount())),
      panels: parsed.panels.filter(panel => allowed.has(panel)),
    };
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
  refreshKey = 0,
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
    <div data-testid="live-session-grid" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={toolbarStyle}>
        <div style={{ minWidth: 0 }}>
          <h2 style={titleStyle}><Grid3X3 size={22} /> GM Screen</h2>
          <p style={subtitleStyle}>Focused table layout: 1–4 panels for combat, party, notes, handouts, dice, and reference.</p>
        </div>
        <div style={toolbarActionsStyle}>
          <div style={countPickerStyle} aria-label="Panel count selector">
            {[1, 2, 3, 4].map(count => {
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
            <section key={`${refreshKey}-${index}-${toolId}`} data-testid={`live-grid-panel-${index + 1}`} style={panelStyle}>
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
      <p style={{ color: rq.muted, fontSize: 12, margin: 0 }}>Fast dice rolls without leaving the GM screen. If the GM enables exploding dice, non-d20 maximum rolls add another die.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(die => (
          <button key={die} type="button" onClick={() => onRollDice?.(`1${die}`, die.toUpperCase())} style={diceButtonStyle}>{die.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <button type="button" onClick={() => onRollDice?.('2d20', 'Two d20s')} style={diceButtonStyle}>2D20</button>
        <button type="button" onClick={() => onRollDice?.('2d6', 'Two d6s')} style={diceButtonStyle}>2D6</button>
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
    gap: 8,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    gridAutoRows: 'minmax(0, 1fr)',
  };
  if (panelCount === 1) return { ...base, gridTemplateColumns: '1fr' };
  if (panelCount === 2) return { ...base, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' };
  if (panelCount === 3) return { ...base, gridTemplateColumns: '1.25fr repeat(2, minmax(0, 1fr))' };
  if (panelCount === 4) return { ...base, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' };
  if (panelCount === 5) return { ...base, gridTemplateColumns: '1.2fr repeat(2, minmax(0, 1fr))' };
  return { ...base, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' };
}

const toolbarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: 0, padding: '8px 10px', flexShrink: 0 };
const titleStyle = { color: rq.text, fontSize: 17, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, margin: 0 };
const subtitleStyle = { color: rq.muted, fontSize: 11, margin: '2px 0 0' };
const toolbarActionsStyle = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const countPickerStyle = { display: 'flex', border: `1px solid ${rq.border}`, background: rq.input, borderRadius: 0, overflow: 'hidden' };
const countButtonStyle = (active) => ({ minWidth: 30, height: 30, border: 'none', borderRight: `1px solid ${rq.borderDefault}`, background: active ? rq.accent : 'transparent', color: active ? 'var(--rq-text-primary, #F5E6C8)' : rq.textSecondary, fontWeight: 900, cursor: 'pointer', fontSize: 12 });
const resetButtonStyle = { minHeight: 30, display: 'inline-flex', alignItems: 'center', gap: 6, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, padding: '0 9px', borderRadius: 0, fontWeight: 900, cursor: 'pointer', fontSize: 12 };
const panelStyle = { background: rq.panel, border: `1px solid ${rq.border}`, borderRadius: 0, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const panelHeaderStyle = { display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between', padding: '6px 8px', borderBottom: `1px solid ${rq.border}`, background: rq.input, flexShrink: 0 };
const panelTitleStyle = { color: rq.text, fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' };
const selectStyle = { minWidth: 118, maxWidth: '58%', background: rq.panel, color: rq.text, border: `1px solid ${rq.borderDefault}`, borderRadius: 0, padding: '5px 7px', fontSize: 10, outline: 'none' };
const panelBodyStyle = { flex: 1, minHeight: 0, overflow: 'auto', padding: 8 };
const openButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.accentHover, padding: '4px 7px', borderRadius: 0, fontSize: 9, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' };
const diceButtonStyle = { background: rq.accentSoft, border: `1px solid ${rq.border}`, color: rq.text, minHeight: 42, borderRadius: 0, fontWeight: 900, cursor: 'pointer' };
const placeholderStyle = { height: '100%', minHeight: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: rq.input, border: `1px dashed ${rq.borderDefault}`, padding: 16 };
