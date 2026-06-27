import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Image as ImageIcon, Monitor, RefreshCw, Send, Skull, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { createDisplayState, publishDisplayState } from '@/lib/liveDisplayBus';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.22)',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.62)',
};

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

  const displayUrl = `/campaign/${campaignId}/player-display`;

  const selectedNpcs = useMemo(() => npcs.filter(npc => selectedNpcIds.includes(npc.id)), [npcs, selectedNpcIds]);
  const selectedScenario = useMemo(() => scenarios.find(scenario => scenario.id === selectedScenarioId), [scenarios, selectedScenarioId]);
  const combatants = useMemo(() => scenarioParticipants(selectedScenario), [selectedScenario]);
  const playerFacingCombatants = useMemo(() => combatants.filter(item => !isPlayerCombatant(item)), [combatants]);
  const visibleCombatants = useMemo(() => playerFacingCombatants.filter((item, index) => visibleCombatantIds.includes(combatantId(item, index))), [playerFacingCombatants, visibleCombatantIds]);

  const openPlayerDisplay = () => {
    window.open(displayUrl, '_blank', 'noopener,noreferrer');
  };

  const publish = (mode, payload = {}) => {
    publishDisplayState(campaignId, createDisplayState(mode, payload));
    toast.success('Sent to player display');
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

  const toggleNpc = (npcId) => {
    setSelectedNpcIds(prev => prev.includes(npcId) ? prev.filter(id => id !== npcId) : [...prev, npcId]);
  };

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

  const toggleCombatant = (id) => {
    setVisibleCombatantIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const selectAllCombatants = () => {
    setVisibleCombatantIds(playerFacingCombatants.map((item, index) => combatantId(item, index)));
  };

  const clearCombatants = () => setVisibleCombatantIds([]);

  return (
    <section style={shellStyle} data-testid="live-player-display-controls">
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={iconStyle}><Monitor size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Extended TV display</p>
            <h2 style={titleStyle}>Player Display Remote</h2>
            <p style={subtitleStyle}>Open a second tab, drag it to the TV, then choose what the players can see.</p>
          </div>
        </div>
        <div style={actionsStyle}>
          <button type="button" onClick={openPlayerDisplay} style={primaryButtonStyle}><Monitor size={14} /> Open Player Display</button>
          <button type="button" onClick={() => setOpen(prev => !prev)} style={secondaryButtonStyle}>{open ? <X size={14} /> : <Eye size={14} />} {open ? 'Hide Controls' : 'Show Controls'}</button>
        </div>
      </header>

      {open && (
        <div style={bodyStyle}>
          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Display title</span>
              <input value={sceneTitle} onChange={(event) => setSceneTitle(event.target.value)} placeholder="Scene title" style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Caption / subtitle</span>
              <input value={sceneSubtitle} onChange={(event) => setSceneSubtitle(event.target.value)} placeholder="Optional player-facing caption" style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Image / map URL</span>
              <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Paste image/map URL or choose a map below" style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Saved map</span>
              <select value="" onChange={(event) => { const map = maps.find(item => item.id === event.target.value); if (map) { setSceneTitle(map.name || map.title || 'Map'); setImageUrl(imageFrom(map)); } }} style={inputStyle}>
                <option value="">Choose saved map...</option>
                {maps.map(map => <option key={map.id} value={map.id}>{map.name || map.title || 'Untitled map'}</option>)}
              </select>
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Combat scenario</span>
              <select value={selectedScenarioId} onChange={(event) => chooseScenario(event.target.value)} style={inputStyle}>
                <option value="">Choose encounter...</option>
                {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name || 'Unnamed encounter'}</option>)}
              </select>
            </label>
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
              <div style={npcHeaderStyle}>
                <strong>NPC portraits visible to players</strong>
                <button type="button" onClick={() => setSelectedNpcIds([])} style={miniButtonStyle}><RefreshCw size={12} /> Clear</button>
              </div>
              <div style={npcGridStyle}>
                {npcs.slice(0, 24).map(npc => (
                  <label key={npc.id} style={npcPillStyle(selectedNpcIds.includes(npc.id))}>
                    <input type="checkbox" checked={selectedNpcIds.includes(npc.id)} onChange={() => toggleNpc(npc.id)} />
                    <span>{npc.name || 'Unnamed NPC'}</span>
                  </label>
                ))}
                {npcs.length === 0 && <p style={mutedStyle}>No NPCs found yet.</p>}
              </div>
            </section>

            <section style={npcBoxStyle}>
              <div style={npcHeaderStyle}>
                <strong>Visible combatants for TV</strong>
                <span style={combatToolbarStyle}>
                  <button type="button" onClick={selectAllCombatants} style={miniButtonStyle}>All</button>
                  <button type="button" onClick={clearCombatants} style={miniButtonStyle}>None</button>
                </span>
              </div>
              <p style={hintStyle}>Only tick enemies or creatures the players are allowed to see. Player characters, hidden enemies, HP, AC, and stat details stay off the TV view.</p>
              <div style={npcGridStyle}>
                {playerFacingCombatants.map((combatant, index) => {
                  const id = combatantId(combatant, index);
                  const checked = visibleCombatantIds.includes(id);
                  return (
                    <label key={id} style={npcPillStyle(checked)}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCombatant(id)} />
                      <span>{combatantName(combatant)}</span>
                    </label>
                  );
                })}
                {playerFacingCombatants.length === 0 && <p style={mutedStyle}>Choose a combat scenario to reveal visible enemies.</p>}
              </div>
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
const actionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: theme.red, color: theme.text, padding: '0 10px', display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: 12, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: 0, background: theme.panel, color: theme.text, padding: '0 10px', display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, cursor: 'pointer', fontFamily: fontStack };
const bodyStyle = { display: 'grid', gap: 10, padding: 10, borderTop: `1px solid ${theme.line}` };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 };
const fieldStyle = { display: 'grid', gap: 5 };
const labelStyle = { color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase' };
const inputStyle = { width: '100%', minHeight: 36, background: theme.bg, border: `1px solid ${theme.lineStrong}`, color: theme.text, padding: '0 9px', fontFamily: fontStack, outline: 'none', colorScheme: 'dark' };
const sendRowStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' };
const controlGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 };
const npcBoxStyle = { background: theme.panel, border: `1px solid ${theme.line}`, padding: 10, display: 'grid', gap: 8 };
const npcHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', color: theme.text, fontSize: 12 };
const miniButtonStyle = { minHeight: 28, border: 0, background: theme.bg, color: theme.text, display: 'inline-flex', gap: 5, alignItems: 'center', padding: '0 8px', fontSize: 11, fontFamily: fontStack, cursor: 'pointer' };
const combatToolbarStyle = { display: 'inline-flex', gap: 6, alignItems: 'center' };
const hintStyle = { margin: 0, color: theme.muted, fontSize: 11, lineHeight: 1.35 };
const npcGridStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 130, overflowY: 'auto' };
const npcPillStyle = (checked) => ({ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '6px 8px', background: checked ? 'rgba(208,0,0,0.28)' : theme.bg, border: `1px solid ${checked ? 'rgba(208,0,0,0.65)' : theme.lineStrong}`, color: theme.text, fontSize: 12, cursor: 'pointer' });
const mutedStyle = { margin: 0, color: theme.muted, fontSize: 12 };
