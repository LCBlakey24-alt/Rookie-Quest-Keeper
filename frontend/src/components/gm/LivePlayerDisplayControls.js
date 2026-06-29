import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Eye, Image as ImageIcon, Monitor, Projector, RefreshCw, Send, Skull, Table2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { createDisplayState, publishDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: 'var(--rq-bg, #242424)',
  panel: 'var(--rq-surface, #2f2f2f)',
  card: 'var(--rq-card, #3a3a3a)',
  hover: 'var(--rq-card-hover, #444444)',
  line: 'var(--rq-line, rgba(255,255,255,0.16))',
  lineStrong: 'var(--rq-line-strong, rgba(255,255,255,0.26))',
  red: 'var(--rq-primary, #d00000)',
  text: 'var(--rq-text, #ffffff)',
  soft: 'var(--rq-muted, rgba(255,255,255,0.74))',
  muted: 'var(--rq-faint, rgba(255,255,255,0.52))',
};

const DISPLAY_TARGETS = [
  { id: 'standing-tv', label: 'Standing TV', icon: Projector, help: 'Big cinematic view for an upright TV, monitor, or projector.' },
  { id: 'virtual-table', label: 'Virtual Table', icon: Table2, help: 'Map-first view for a flat TV table, touch table, or VTT-style screen.' },
];

function imageFrom(item) {
  return item?.image_url || item?.map_url || item?.url || item?.attachment_url || item?.avatar_url || item?.portrait_url || item?.token_url || '';
}

function scenarioParticipants(scenario) {
  return scenario?.participants || scenario?.combatants || scenario?.enemies || [];
}

function combatantId(item, index) {
  return String(item?.id || item?.combatant_id || item?.monster_id || item?.name || item?.monster_name || `combatant-${index}`);
}

function combatantName(item) {
  return item?.name || item?.monster_name || item?.display_name || item?.creature_name || 'Enemy';
}

function isPlayerCombatant(item) {
  return String(item?.type || item?.kind || '').toLowerCase() === 'player' || item?.is_player === true;
}

function targetStorageKey(campaignId) {
  return `rqk.playerDisplay.target.${campaignId}`;
}

function normaliseTarget(targetId) {
  return targetId === 'virtual-table' ? 'virtual-table' : 'standing-tv';
}

function loadTarget(campaignId) {
  try { return normaliseTarget(localStorage.getItem(targetStorageKey(campaignId))); } catch { return 'standing-tv'; }
}

export default function LivePlayerDisplayControls({ campaignId, campaignName = 'Campaign' }) {
  const [open, setOpen] = useState(false);
  const [maps, setMaps] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [sceneTitle, setSceneTitle] = useState(campaignName || 'Scene');
  const [sceneSubtitle, setSceneSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedNpcIds, setSelectedNpcIds] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [visibleCombatantIds, setVisibleCombatantIds] = useState([]);
  const [displayTarget, setDisplayTarget] = useState(() => loadTarget(campaignId));

  useEffect(() => {
    try { localStorage.setItem(targetStorageKey(campaignId), displayTarget); } catch { /* ignore */ }
  }, [campaignId, displayTarget]);

  useEffect(() => {
    if (!campaignId) return;
    Promise.all([
      apiClient.get(`/campaigns/${campaignId}/maps`).catch(() => ({ data: [] })),
      apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
      apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
    ]).then(([mapsRes, npcsRes, scenariosRes]) => {
      setMaps(Array.isArray(mapsRes.data) ? mapsRes.data : []);
      setNpcs(Array.isArray(npcsRes.data) ? npcsRes.data : []);
      setScenarios(Array.isArray(scenariosRes.data) ? scenariosRes.data : []);
    });
  }, [campaignId]);

  const displayUrlFor = (targetId = displayTarget) => `/campaign/${campaignId}/player-display?target=${encodeURIComponent(normaliseTarget(targetId))}`;
  const selectedNpcs = useMemo(() => npcs.filter(npc => selectedNpcIds.includes(npc.id)), [npcs, selectedNpcIds]);
  const selectedScenario = useMemo(() => scenarios.find(scenario => scenario.id === selectedScenarioId), [scenarios, selectedScenarioId]);
  const combatants = useMemo(() => scenarioParticipants(selectedScenario), [selectedScenario]);
  const playerFacingCombatants = useMemo(() => combatants.filter(item => !isPlayerCombatant(item)), [combatants]);
  const visibleCombatants = useMemo(() => playerFacingCombatants.filter((item, index) => visibleCombatantIds.includes(combatantId(item, index))), [playerFacingCombatants, visibleCombatantIds]);
  const currentTarget = DISPLAY_TARGETS.find(target => target.id === displayTarget) || DISPLAY_TARGETS[0];

  const publish = (mode, payload = {}, targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    publishDisplayState(campaignId, createDisplayState(mode, { ...payload, display_target: safeTarget }));
    const label = DISPLAY_TARGETS.find(target => target.id === safeTarget)?.label || currentTarget.label;
    toast.success('Sent to player display', { description: label });
  };

  const sendDisplayTarget = (targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    const target = DISPLAY_TARGETS.find(item => item.id === safeTarget) || DISPLAY_TARGETS[0];
    publishDisplayState(campaignId, createDisplayState('blank', {
      title: target.label,
      subtitle: target.help,
      display_target: target.id,
    }));
    toast.success(`Display set for ${target.label}`);
  };

  const openPlayerDisplay = (targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    setDisplayTarget(safeTarget);
    sendDisplayTarget(safeTarget);
    const opened = window.open(displayUrlFor(safeTarget), '_blank', 'noopener,noreferrer');
    if (!opened) toast.error('The display tab was blocked. Allow pop-ups, then try again.');
  };

  const copyDisplayLink = async () => {
    const url = `${window.location.origin}${displayUrlFor(displayTarget)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Display link copied');
    } catch {
      toast.info(url);
    }
  };

  const clearDisplay = () => publish('blank', { title: 'Waiting for the GM', subtitle: 'The next reveal will appear here.' });

  const sendTitle = () => publish('title', {
    eyebrow: 'Scene',
    title: sceneTitle || campaignName || 'Scene',
    subtitle: sceneSubtitle,
  });

  const sendImage = () => {
    if (!imageUrl.trim()) {
      toast.error('Choose or paste an image/map URL first');
      return;
    }
    publish('image', {
      title: sceneTitle || 'Player View',
      image_url: imageUrl.trim(),
      caption: sceneSubtitle,
    });
  };

  const sendNpcGrid = () => {
    publish('npc-grid', {
      title: sceneTitle || 'Who you can see',
      eyebrow: 'People in the scene',
      npcs: selectedNpcs.map(npc => ({
        id: npc.id,
        name: npc.name,
        subtitle: npc.role || npc.race || npc.location || '',
        description: npc.description || npc.notes || '',
        image_url: imageFrom(npc),
      })),
    });
  };

  const sendCombat = () => {
    publish('combat', {
      title: selectedScenario?.name || sceneTitle || 'Combat',
      map_url: imageUrl.trim() || imageFrom(selectedScenario),
      caption: sceneSubtitle,
      tokens: visibleCombatants.map((item, index) => ({
        id: combatantId(item, index),
        name: combatantName(item),
        image_url: imageFrom(item),
        x: Number(item.x ?? item.position?.x ?? item.token_x ?? 0),
        y: Number(item.y ?? item.position?.y ?? item.token_y ?? 0),
      })),
    });
  };

  const toggleNpc = (npcId) => setSelectedNpcIds(prev => prev.includes(npcId) ? prev.filter(id => id !== npcId) : [...prev, npcId]);

  const chooseScenario = (scenarioId) => {
    setSelectedScenarioId(scenarioId);
    const scenario = scenarios.find(item => item.id === scenarioId);
    const nextCombatants = scenarioParticipants(scenario).filter(item => !isPlayerCombatant(item));
    setVisibleCombatantIds(nextCombatants.filter(item => item.hidden !== true).map((item, index) => combatantId(item, index)));
    if (scenario) {
      setSceneTitle(scenario.name || 'Combat');
      const scenarioMap = imageFrom(scenario);
      if (scenarioMap) setImageUrl(scenarioMap);
    }
  };

  const toggleCombatant = (id) => setVisibleCombatantIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const selectAllCombatants = () => setVisibleCombatantIds(playerFacingCombatants.map((item, index) => combatantId(item, index)));
  const clearCombatants = () => setVisibleCombatantIds([]);

  return (
    <section style={shellStyle} data-testid="live-player-display-controls">
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={iconStyle}><Monitor size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Second screen / virtual table</p>
            <h2 style={titleStyle}>Player Display Remote</h2>
            <p style={subtitleStyle}>Open a second browser tab on a TV, projector, or flat table screen. This remote sends only player-safe reveals.</p>
          </div>
        </div>
        <div style={actionsStyle}>
          <button type="button" onClick={() => openPlayerDisplay('standing-tv')} style={primaryButtonStyle}><Projector size={14} /> Open TV</button>
          <button type="button" onClick={() => openPlayerDisplay('virtual-table')} style={primaryButtonStyle}><Table2 size={14} /> Open Table</button>
          <button type="button" onClick={copyDisplayLink} style={secondaryButtonStyle}><Copy size={14} /> Copy Link</button>
          <button type="button" onClick={() => setOpen(prev => !prev)} style={secondaryButtonStyle}>{open ? <X size={14} /> : <Eye size={14} />} {open ? 'Hide Controls' : 'Show Controls'}</button>
        </div>
      </header>

      <div style={statusStripStyle}>
        <span><strong>Current target:</strong> {currentTarget.label}</span>
        <span><strong>Sync:</strong> same-browser tabs update live through BroadcastChannel/localStorage</span>
      </div>

      {open && (
        <div style={bodyStyle}>
          <section style={targetPanelStyle} data-testid="player-display-target-selector">
            <div>
              <strong style={targetPanelTitleStyle}>Display target</strong>
              <p style={hintStyle}>Standing TV is cinematic and upright. Virtual Table is map-first for a flat screen or table display.</p>
            </div>
            <div style={targetGridStyle}>
              {DISPLAY_TARGETS.map(target => {
                const Icon = target.icon;
                const active = displayTarget === target.id;
                return (
                  <button key={target.id} type="button" onClick={() => { setDisplayTarget(target.id); sendDisplayTarget(target.id); }} style={targetButtonStyle(active)}>
                    <Icon size={17} />
                    <strong>{target.label}</strong>
                    <span>{target.help}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div style={formGridStyle}>
            <label style={fieldStyle}><span style={labelStyle}>Display title</span><input value={sceneTitle} onChange={(event) => setSceneTitle(event.target.value)} placeholder="Scene title" style={inputStyle} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Caption / subtitle</span><input value={sceneSubtitle} onChange={(event) => setSceneSubtitle(event.target.value)} placeholder="Optional player-facing caption" style={inputStyle} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Image / map URL</span><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Paste image/map URL or choose a map below" style={inputStyle} /></label>
            <label style={fieldStyle}><span style={labelStyle}>Saved map</span><select value="" onChange={(event) => { const map = maps.find(item => item.id === event.target.value); if (map) { setSceneTitle(map.name || map.title || 'Map'); setImageUrl(imageFrom(map)); } }} style={inputStyle}><option value="">Choose saved map...</option>{maps.map(map => <option key={map.id} value={map.id}>{map.name || map.title || 'Untitled map'}</option>)}</select></label>
            <label style={fieldStyle}><span style={labelStyle}>Combat scenario</span><select value={selectedScenarioId} onChange={(event) => chooseScenario(event.target.value)} style={inputStyle}><option value="">Choose encounter...</option>{scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name || 'Unnamed encounter'}</option>)}</select></label>
          </div>

          <section style={sendRowStyle}>
            <button type="button" onClick={clearDisplay} style={secondaryButtonStyle}><X size={14} /> Blank</button>
            <button type="button" onClick={sendTitle} style={primaryButtonStyle}><Send size={14} /> Send Scene Title</button>
            <button type="button" onClick={sendImage} style={primaryButtonStyle}><ImageIcon size={14} /> Send Image / Map</button>
            <button type="button" onClick={sendNpcGrid} style={primaryButtonStyle}><Users size={14} /> Send NPC Grid ({selectedNpcs.length})</button>
            <button type="button" onClick={sendCombat} style={primaryButtonStyle}><Skull size={14} /> Send Combat View ({visibleCombatants.length})</button>
          </section>

          <section style={controlGridStyle}>
            <section style={npcBoxStyle}>
              <div style={npcHeaderStyle}><strong>NPC portraits visible to players</strong><button type="button" onClick={() => setSelectedNpcIds([])} style={miniButtonStyle}><RefreshCw size={12} /> Clear</button></div>
              <div style={npcGridStyle}>{npcs.slice(0, 24).map(npc => <label key={npc.id} style={npcPillStyle(selectedNpcIds.includes(npc.id))}><input type="checkbox" checked={selectedNpcIds.includes(npc.id)} onChange={() => toggleNpc(npc.id)} /><span>{npc.name || 'Unnamed NPC'}</span></label>)}{npcs.length === 0 && <p style={mutedStyle}>No NPCs found yet.</p>}</div>
            </section>

            <section style={npcBoxStyle}>
              <div style={npcHeaderStyle}><strong>Visible combatants for display</strong><span style={combatToolbarStyle}><button type="button" onClick={selectAllCombatants} style={miniButtonStyle}>All</button><button type="button" onClick={clearCombatants} style={miniButtonStyle}>None</button></span></div>
              <p style={hintStyle}>Only tick enemies or creatures the players are allowed to see. Player characters, hidden enemies, HP, AC, and private GM details stay off the display.</p>
              <div style={npcGridStyle}>{playerFacingCombatants.map((combatant, index) => { const id = combatantId(combatant, index); const checked = visibleCombatantIds.includes(id); return <label key={id} style={npcPillStyle(checked)}><input type="checkbox" checked={checked} onChange={() => toggleCombatant(id)} /><span>{combatantName(combatant)}</span></label>; })}{playerFacingCombatants.length === 0 && <p style={mutedStyle}>Choose a combat scenario to reveal visible enemies.</p>}</div>
            </section>
          </section>
        </div>
      )}
    </section>
  );
}

const shellStyle = { background: theme.card, border: `1px solid ${theme.line}`, color: theme.text, fontFamily: fontStack, flexShrink: 0 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', padding: 10 };
const iconStyle = { width: 34, height: 34, display: 'grid', placeItems: 'center', background: theme.bg, borderLeft: `5px solid ${theme.red}` };
const eyebrowStyle = { margin: 0, color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: '2px 0 3px', color: theme.text, fontSize: 17, fontWeight: 950 };
const subtitleStyle = { margin: 0, color: theme.soft, fontSize: 11, lineHeight: 1.35 };
const actionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: theme.red, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: 0, background: theme.bg, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const statusStripStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '8px 10px', borderTop: `1px solid ${theme.line}`, background: theme.panel, color: theme.soft, fontSize: 11, lineHeight: 1.35 };
const bodyStyle = { display: 'grid', gap: 10, padding: '0 10px 10px' };
const targetPanelStyle = { display: 'grid', gridTemplateColumns: 'minmax(180px, 0.55fr) minmax(260px, 1fr)', gap: 10, alignItems: 'stretch', background: theme.panel, border: `1px solid ${theme.line}`, padding: 10 };
const targetPanelTitleStyle = { display: 'block', color: theme.text, fontSize: 13, fontWeight: 950, marginBottom: 4 };
const targetGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 };
const targetButtonStyle = (active) => ({ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: '3px 8px', alignItems: 'center', textAlign: 'left', background: active ? theme.red : theme.bg, color: theme.text, border: active ? `1px solid ${theme.red}` : `1px solid ${theme.line}`, padding: 9, cursor: 'pointer', fontFamily: fontStack, fontWeight: 900 });
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 };
const fieldStyle = { display: 'grid', gap: 5 };
const labelStyle = { color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { minHeight: 34, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: '0 8px', outline: 'none', fontFamily: fontStack };
const sendRowStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' };
const controlGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 };
const npcBoxStyle = { background: theme.panel, border: `1px solid ${theme.line}`, padding: 10 };
const npcHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 };
const miniButtonStyle = { minHeight: 28, border: 0, background: theme.card, color: theme.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const npcGridStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 170, overflowY: 'auto' };
const npcPillStyle = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, background: active ? theme.red : theme.bg, color: theme.text, border: `1px solid ${active ? theme.red : theme.line}`, padding: '6px 8px', fontSize: 12, fontWeight: 850, cursor: 'pointer' });
const mutedStyle = { margin: 0, color: theme.muted, fontSize: 12 };
const hintStyle = { margin: '0 0 8px', color: theme.soft, fontSize: 12, lineHeight: 1.4 };
const combatToolbarStyle = { display: 'inline-flex', gap: 5 };
