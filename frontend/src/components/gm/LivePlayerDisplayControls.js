import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Eye, Image as ImageIcon, Layers, Monitor, Projector, RefreshCw, Send, ShieldCheck, Skull, Sparkles, Table2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { createDisplayState, loadDisplayState, publishCampaignDisplayState } from '@/lib/liveDisplayBus';
import { normalizeCampaignCharacter } from '@/data/campaignCharacterBridge';

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
  { id: 'standing-tv', label: 'Standing TV', icon: Projector, help: 'Cinematic upright display for a TV, monitor, or projector.', ratio: '16:9 upright wall screen' },
  { id: 'virtual-table', label: 'Virtual Table', icon: Table2, help: 'Map-first display for a flat TV table, touch table, or VTT-style screen.', ratio: 'Flat table map surface' },
];

const SCENE_PRESETS = [
  { id: 'lobby', label: 'Waiting Screen', mode: 'blank', icon: Monitor, payload: { title: 'Waiting for the GM', subtitle: 'The next reveal will appear here.' } },
  { id: 'scene', label: 'Scene Title', mode: 'title', icon: Sparkles, payload: { eyebrow: 'Scene' } },
  { id: 'map', label: 'Map / Image', mode: 'image', icon: ImageIcon, payload: {} },
  { id: 'combat', label: 'Combat HUD', mode: 'combat', icon: Skull, payload: {} },
];

const FLOW_PRESETS = [
  { id: 'blackout', label: 'Panic Blackout', icon: X, mode: 'blank', title: 'Screen Hidden', subtitle: 'The GM has hidden the player display.' },
  { id: 'initiative', label: 'Roll Initiative', icon: Skull, mode: 'title', eyebrow: 'Combat', title: 'Roll Initiative', subtitle: 'Combat begins.' },
  { id: 'spotlight', label: 'Spotlight Reveal', icon: Sparkles, mode: 'title', eyebrow: 'Spotlight', title: '', subtitle: '' },
  { id: 'travel', label: 'Travel Montage', icon: Projector, mode: 'title', eyebrow: 'Journey', title: 'On the Road', subtitle: 'The party pushes onward.' },
  { id: 'safe-break', label: 'Table Break', icon: Monitor, mode: 'blank', title: 'Short Break', subtitle: 'The adventure will continue shortly.' },
];

const MESSAGE_PRESETS = [
  { id: 'session-start', label: 'Session Starts', eyebrow: 'Tonight', title: 'Session Begins', subtitle: 'Settle in. The adventure continues.' },
  { id: 'quest-updated', label: 'Quest Updated', eyebrow: 'Quest Updated', title: 'New information discovered', subtitle: 'The party has a new lead.' },
  { id: 'you-hear', label: 'You Hear...', eyebrow: 'You hear...', title: 'Something moves nearby', subtitle: 'Listen carefully.' },
  { id: 'you-see', label: 'You See...', eyebrow: 'You see...', title: 'A detail catches your eye', subtitle: 'The scene changes.' },
  { id: 'long-rest', label: 'Long Rest', eyebrow: 'Rest', title: 'Long Rest Complete', subtitle: 'Abilities, spells, and hit points recover as normal.' },
];

const BANNER_PRESETS = [
  { id: 'clue', label: 'Clue Found', eyebrow: 'Clue', text: 'A clue has been discovered.' },
  { id: 'danger', label: 'Danger', eyebrow: 'Danger', text: 'Something dangerous is close.', tone: 'danger' },
  { id: 'weather', label: 'Weather Shift', eyebrow: 'Environment', text: 'The weather begins to turn.' },
  { id: 'timer', label: 'Clock Ticks', eyebrow: 'Time Pressure', text: 'The clock is ticking.' },
  { id: 'inspiration', label: 'Inspiration', eyebrow: 'Inspiration', text: 'Heroic inspiration awarded.' },
];

function imageFrom(item) {
  return item?.image_url || item?.map_url || item?.url || item?.attachment_url || item?.avatar_url || item?.portrait_url || item?.portraitUrl || item?.imageUrl || item?.token_url || item?.character_image || item?.character_portrait || '';
}

function scenarioParticipants(scenario) {
  return scenario?.participants || scenario?.combatants || scenario?.enemies || [];
}

function combatantId(item, index) {
  return String(item?.id || item?.combatant_id || item?.monster_id || item?.npc_id || item?.name || item?.monster_name || `combatant-${index}`);
}

function combatantName(item) {
  return item?.name || item?.monster_name || item?.display_name || item?.creature_name || 'Enemy';
}

function isPlayerCombatant(item) {
  return String(item?.type || item?.kind || '').toLowerCase() === 'player' || item?.is_player === true;
}

function signed(value = 0) {
  const parsed = Number(value || 0);
  return parsed >= 0 ? `+${parsed}` : `${parsed}`;
}

function safeNumber(...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== '');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalisePartyMember(value = {}) {
  const base = normalizeCampaignCharacter(value);
  return {
    ...base,
    id: base.id || value.id || value.player_id || value.user_id || base.name,
    imageUrl: base.imageUrl || base.portraitUrl || imageFrom(value) || imageFrom(base),
    type: 'player',
  };
}

function normaliseCombatantPayload(item = {}, id = '') {
  const type = String(item.type || item.kind || item.role || '').toLowerCase().includes('npc') ? 'npc' : 'enemy';
  const maxHp = safeNumber(item.max_hp, item.maxHp, item.hp_max, item.maximum_hp);
  const hp = safeNumber(item.current_hp, item.currentHp, item.hp, maxHp);
  const hpPercent = maxHp ? Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100))) : 0;
  const initiative = safeNumber(item.initiative, item.initiative_bonus, item.init);
  return {
    id,
    type,
    name: combatantName(item),
    subtitle: item.subtitle || item.creature_type || item.role || (type === 'npc' ? 'NPC' : 'Enemy'),
    image_url: imageFrom(item),
    x: safeNumber(item.x, item.position?.x, item.token_x),
    y: safeNumber(item.y, item.position?.y, item.token_y),
    ac: safeNumber(item.ac, item.armor_class, item.armorClass),
    hp,
    max_hp: maxHp,
    hpPercent,
    hpStatus: maxHp && hp <= 0 ? 'down' : hpPercent <= 33 ? 'bloodied' : hpPercent <= 66 ? 'hurt' : 'healthy',
    initiative,
    initiativeLabel: signed(initiative),
    speed: safeNumber(item.speed, item.walking_speed, item.movement_speed),
    passivePerception: safeNumber(item.passive_perception, item.passivePerception),
    hidden: item.hidden === true,
  };
}

function normaliseTarget(targetId) {
  return targetId === 'virtual-table' ? 'virtual-table' : 'standing-tv';
}

function targetStorageKey(campaignId) {
  return `rqk.playerDisplay.target.${campaignId}`;
}

function loadTarget(campaignId) {
  try { return normaliseTarget(localStorage.getItem(targetStorageKey(campaignId))); } catch { return 'standing-tv'; }
}

export default function LivePlayerDisplayControls({ campaignId, campaignName = 'Campaign' }) {
  const [open, setOpen] = useState(true);
  const [maps, setMaps] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [party, setParty] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [sceneTitle, setSceneTitle] = useState(campaignName || 'Scene');
  const [sceneSubtitle, setSceneSubtitle] = useState('');
  const [quickAnnouncement, setQuickAnnouncement] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedNpcIds, setSelectedNpcIds] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [visibleCombatantIds, setVisibleCombatantIds] = useState([]);
  const [combatRound, setCombatRound] = useState(1);
  const [activeCombatantId, setActiveCombatantId] = useState('');
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
      apiClient.get(`/campaigns/${campaignId}/players`).catch(() => ({ data: [] })),
    ]).then(([mapsRes, npcsRes, scenariosRes, playersRes]) => {
      setMaps(Array.isArray(mapsRes.data) ? mapsRes.data : []);
      setNpcs(Array.isArray(npcsRes.data) ? npcsRes.data : []);
      setScenarios(Array.isArray(scenariosRes.data) ? scenariosRes.data : []);
      const members = Array.isArray(playersRes.data) ? playersRes.data.map(normalisePartyMember).filter(member => member?.name) : [];
      setParty(members);
      if (!activeCombatantId && members[0]?.id) setActiveCombatantId(`player-${members[0].id}`);
    });
  }, [campaignId, activeCombatantId]);

  const displayUrlFor = (targetId = displayTarget) => `/campaign/${campaignId}/player-display?target=${encodeURIComponent(normaliseTarget(targetId))}`;
  const selectedNpcs = useMemo(() => npcs.filter(npc => selectedNpcIds.includes(String(npc.id))), [npcs, selectedNpcIds]);
  const selectedScenario = useMemo(() => scenarios.find(scenario => String(scenario.id) === String(selectedScenarioId)), [scenarios, selectedScenarioId]);
  const combatants = useMemo(() => scenarioParticipants(selectedScenario), [selectedScenario]);
  const playerFacingCombatants = useMemo(() => combatants.filter(item => !isPlayerCombatant(item)), [combatants]);
  const visibleCombatantEntries = useMemo(() => playerFacingCombatants.map((item, index) => ({ item, index, id: combatantId(item, index) })).filter(entry => visibleCombatantIds.includes(entry.id)), [playerFacingCombatants, visibleCombatantIds]);
  const partyPayload = useMemo(() => party.map(member => ({
    id: member.id,
    name: member.name,
    playerName: member.playerName,
    className: member.className,
    race: member.race,
    level: member.level,
    imageUrl: member.imageUrl,
    hp: member.hp,
    currentHp: member.currentHp,
    maxHp: member.maxHp,
    hpPercent: member.hpPercent,
    hpStatus: member.hpStatus,
    ac: member.ac || member.armorClass,
    initiative: member.initiative,
    initiativeLabel: member.initiativeLabel,
    speed: member.speed,
    passivePerception: member.passivePerception,
  })), [party]);
  const combatTokenPayload = useMemo(() => visibleCombatantEntries.map(({ item, id }) => normaliseCombatantPayload(item, id)), [visibleCombatantEntries]);
  const combatRosterOptions = useMemo(() => [
    ...partyPayload.map(member => ({ id: `player-${member.id}`, name: member.name, type: 'player', initiative: member.initiative || 0, label: `${member.name} · Player ${member.initiativeLabel || signed(member.initiative)}` })),
    ...combatTokenPayload.map(token => ({ id: token.id, name: token.name, type: token.type, initiative: token.initiative || 0, label: `${token.name} · ${token.type === 'npc' ? 'NPC' : 'Enemy'} ${token.initiativeLabel || signed(token.initiative)}` })),
  ].sort((a, b) => Number(b.initiative || 0) - Number(a.initiative || 0)), [partyPayload, combatTokenPayload]);
  const currentTarget = DISPLAY_TARGETS.find(target => target.id === displayTarget) || DISPLAY_TARGETS[0];

  const publish = (mode, payload = {}, targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    publishCampaignDisplayState(campaignId, createDisplayState(mode, { ...payload, display_target: safeTarget }));
    const label = DISPLAY_TARGETS.find(target => target.id === safeTarget)?.label || currentTarget.label;
    toast.success('Sent to player display', { description: label });
  };

  const publishBannerOverlay = (banner) => {
    const current = loadDisplayState(campaignId) || createDisplayState('blank', {});
    const mode = current?.mode || 'blank';
    const payload = { ...(current?.payload || {}) };
    const safeTarget = normaliseTarget(displayTarget || payload.display_target);
    if (banner) payload.banner = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, eyebrow: 'Announcement', ...banner };
    else delete payload.banner;
    publishCampaignDisplayState(campaignId, createDisplayState(mode, { ...payload, display_target: safeTarget }));
    toast.success(banner ? 'Banner sent over current display' : 'Banner cleared', { description: DISPLAY_TARGETS.find(target => target.id === safeTarget)?.label || currentTarget.label });
  };

  const sendDisplayTarget = (targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    const target = DISPLAY_TARGETS.find(item => item.id === safeTarget) || DISPLAY_TARGETS[0];
    publishCampaignDisplayState(campaignId, createDisplayState('blank', {
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

  const copyDisplayLink = async (targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    const url = `${window.location.origin}${displayUrlFor(safeTarget)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`${DISPLAY_TARGETS.find(target => target.id === safeTarget)?.label || 'Display'} link copied`);
    } catch {
      toast.info(url);
    }
  };

  const clearDisplay = () => publish('blank', { title: 'Waiting for the GM', subtitle: 'The next reveal will appear here.' });

  const sendTitle = () => publish('title', {
    eyebrow: 'Scene',
    title: sceneTitle || campaignName || 'Scene',
    subtitle: sceneSubtitle,
    party: partyPayload,
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
      party: partyPayload,
    });
  };

  const sendNpcGrid = () => {
    publish('npc-grid', {
      title: sceneTitle || 'Who you can see',
      eyebrow: 'People in the scene',
      party: partyPayload,
      npcs: selectedNpcs.map(npc => ({
        id: npc.id,
        name: npc.name,
        subtitle: npc.role || npc.race || npc.location || '',
        description: npc.description || npc.notes || '',
        image_url: imageFrom(npc),
      })),
    });
  };

  const combatPayload = (activeId = activeCombatantId, roundValue = combatRound) => ({
    title: selectedScenario?.name || sceneTitle || 'Combat',
    map_url: imageUrl.trim() || imageFrom(selectedScenario),
    caption: sceneSubtitle,
    round: Math.max(1, Number(roundValue) || 1),
    active_id: activeId || combatRosterOptions[0]?.id || '',
    party: partyPayload,
    tokens: combatTokenPayload,
  });

  const sendCombat = (activeId = activeCombatantId, roundValue = combatRound) => {
    if (!selectedScenario && !imageUrl.trim() && combatTokenPayload.length === 0) {
      toast.error('Choose a combat scenario or map first');
      return;
    }
    publish('combat', combatPayload(activeId, roundValue));
  };

  const sendCombatTurn = (direction = 1) => {
    if (!combatRosterOptions.length) {
      sendCombat();
      return;
    }
    const currentIndex = Math.max(0, combatRosterOptions.findIndex(item => item.id === activeCombatantId));
    const nextIndex = (currentIndex + direction + combatRosterOptions.length) % combatRosterOptions.length;
    const next = combatRosterOptions[nextIndex];
    setActiveCombatantId(next.id);
    sendCombat(next.id, combatRound);
  };

  const announceRound = () => {
    const nextRound = Math.max(1, Number(combatRound) || 1);
    publishBannerOverlay({ eyebrow: 'Combat Round', text: `Round ${nextRound} begins`, subtitle: selectedScenario?.name || sceneTitle || 'Combat' });
    sendCombat(activeCombatantId, nextRound);
  };

  const sendPreset = (preset) => {
    if (preset.mode === 'blank') {
      clearDisplay();
      return;
    }
    if (preset.mode === 'title') {
      sendTitle();
      return;
    }
    if (preset.mode === 'image') {
      sendImage();
      return;
    }
    if (preset.mode === 'combat') {
      sendCombat();
    }
  };

  const sendFlowPreset = (preset) => {
    const title = preset.id === 'spotlight' ? (sceneTitle || campaignName || 'Spotlight') : preset.title;
    const subtitle = preset.id === 'spotlight' ? sceneSubtitle : preset.subtitle;
    publish(preset.mode, { eyebrow: preset.eyebrow, title, subtitle, party: partyPayload });
  };

  const sendAnnouncement = () => {
    const text = quickAnnouncement.trim();
    if (!text) {
      toast.error('Type a player-facing announcement first');
      return;
    }
    publish('title', { eyebrow: 'Announcement', title: text, subtitle: sceneSubtitle, party: partyPayload });
  };

  const sendMessagePreset = (preset) => {
    setQuickAnnouncement(preset.title);
    publish('title', { eyebrow: preset.eyebrow, title: preset.title, subtitle: preset.subtitle, party: partyPayload });
  };

  const sendBanner = () => {
    const text = bannerMessage.trim();
    if (!text) {
      toast.error('Type a banner message first');
      return;
    }
    publishBannerOverlay({ eyebrow: 'Table Update', text, subtitle: sceneSubtitle });
  };

  const sendBannerPreset = (preset) => {
    setBannerMessage(preset.text);
    publishBannerOverlay({ eyebrow: preset.eyebrow, text: preset.text, tone: preset.tone });
  };

  const toggleNpc = (npcId) => {
    const safeId = String(npcId);
    setSelectedNpcIds(prev => prev.includes(safeId) ? prev.filter(id => id !== safeId) : [...prev, safeId]);
  };

  const chooseScenario = (scenarioId) => {
    setSelectedScenarioId(scenarioId);
    const scenario = scenarios.find(item => String(item.id) === String(scenarioId));
    const nextCombatants = scenarioParticipants(scenario).filter(item => !isPlayerCombatant(item));
    const nextIds = nextCombatants.filter(item => item.hidden !== true).map((item, index) => combatantId(item, index));
    setVisibleCombatantIds(nextIds);
    setCombatRound(1);
    setActiveCombatantId(party[0]?.id ? `player-${party[0].id}` : nextIds[0] || '');
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
            <p style={eyebrowStyle}>Player-side screen</p>
            <h2 style={titleStyle}>Extended Display Command Centre</h2>
            <p style={subtitleStyle}>Open a clean player-facing screen for a standing TV or virtual table, then push only safe reveals during live play.</p>
          </div>
        </div>
        <div style={actionsStyle}>
          <button type="button" onClick={() => openPlayerDisplay('standing-tv')} style={primaryButtonStyle}><Projector size={14} /> Open TV</button>
          <button type="button" onClick={() => openPlayerDisplay('virtual-table')} style={primaryButtonStyle}><Table2 size={14} /> Open Table</button>
          <button type="button" onClick={() => copyDisplayLink(displayTarget)} style={secondaryButtonStyle}><Copy size={14} /> Copy Link</button>
          <button type="button" onClick={() => sendFlowPreset(FLOW_PRESETS[0])} style={dangerButtonStyle}><X size={14} /> Blackout</button>
          <button type="button" onClick={() => publishBannerOverlay(null)} style={secondaryButtonStyle}><X size={14} /> Clear Banner</button>
          <button type="button" onClick={() => setOpen(prev => !prev)} style={secondaryButtonStyle}>{open ? <X size={14} /> : <Eye size={14} />} {open ? 'Hide Advanced' : 'Show Advanced'}</button>
        </div>
      </header>

      <div style={statusStripStyle}>
        <span><strong>Current target:</strong> {currentTarget.label}</span>
        <span><strong>Party:</strong> {partyPayload.length} linked player{partyPayload.length === 1 ? '' : 's'} ready for the HUD</span>
        <span><strong>Combat:</strong> Round {combatRound || 1} · {combatRosterOptions.length} visible actor{combatRosterOptions.length === 1 ? '' : 's'}</span>
      </div>

      <div style={bodyStyle}>
        <section style={commandDeckStyle}>
          <div style={targetGridStyle} data-testid="player-display-target-selector">
            {DISPLAY_TARGETS.map(target => {
              const Icon = target.icon;
              const active = displayTarget === target.id;
              return (
                <button key={target.id} type="button" onClick={() => { setDisplayTarget(target.id); sendDisplayTarget(target.id); }} style={targetButtonStyle(active)}>
                  <Icon size={20} />
                  <span><strong>{target.label}</strong><small>{target.ratio}</small></span>
                  <em>{target.help}</em>
                </button>
              );
            })}
          </div>
          <aside style={previewPanelStyle}>
            <p style={eyebrowStyle}>Ready to send</p>
            <strong style={previewTitleStyle}>{sceneTitle || campaignName || 'Scene'}</strong>
            <span style={previewTextStyle}>{sceneSubtitle || 'No caption set yet.'}</span>
            <div style={previewMetaStyle}>
              <span><Layers size={12} /> {maps.length} maps</span>
              <span><Users size={12} /> {partyPayload.length} players</span>
              <span><Skull size={12} /> {visibleCombatantEntries.length} visible enemies/NPCs</span>
            </div>
          </aside>
        </section>

        <section style={combatCommanderStyle} data-testid="combat-display-commander">
          <div style={quickSendHeaderStyle}>
            <div>
              <strong>Combat display commander</strong>
              <p>Push the current battle map, party roster, visible enemies/NPCs, round, and active turn to the TV/table.</p>
            </div>
            <span style={safeBadgeStyle}><Skull size={13} /> Battle HUD</span>
          </div>
          <div style={turnRowStyle}>
            <label style={miniFieldStyle}><span>Round</span><input type="number" min="1" value={combatRound} onChange={(event) => setCombatRound(Math.max(1, Number(event.target.value) || 1))} style={inputStyle} /></label>
            <label style={wideFieldStyle}><span>Active turn</span><select value={activeCombatantId} onChange={(event) => { setActiveCombatantId(event.target.value); sendCombat(event.target.value, combatRound); }} style={inputStyle}><option value="">Auto / top initiative</option>{combatRosterOptions.map(actor => <option key={actor.id} value={actor.id}>{actor.label}</option>)}</select></label>
            <button type="button" onClick={() => sendCombatTurn(-1)} style={secondaryButtonStyle}>Prev Turn</button>
            <button type="button" onClick={() => sendCombatTurn(1)} style={primaryButtonStyle}>Next Turn</button>
            <button type="button" onClick={announceRound} style={secondaryButtonStyle}><Sparkles size={14} /> Round Banner</button>
          </div>
          <div style={presetGridStyle}>
            <button type="button" onClick={() => sendCombat(activeCombatantId, combatRound)} style={primaryButtonStyle}><Skull size={14} /> Start / Update Combat HUD</button>
            <button type="button" onClick={() => { setCombatRound(prev => Math.max(1, Number(prev || 1) + 1)); publishBannerOverlay({ eyebrow: 'Combat Round', text: `Round ${Math.max(1, Number(combatRound || 1) + 1)} begins`, subtitle: selectedScenario?.name || sceneTitle || 'Combat' }); }} style={presetButtonStyle}>+ Round</button>
            <button type="button" onClick={selectAllCombatants} style={presetButtonStyle}>Reveal All Enemies/NPCs</button>
            <button type="button" onClick={clearCombatants} style={dangerPresetButtonStyle}>Hide Enemies/NPCs</button>
          </div>
          <div style={combatActiveGridStyle}>{combatRosterOptions.slice(0, 12).map(actor => <button key={actor.id} type="button" onClick={() => { setActiveCombatantId(actor.id); sendCombat(actor.id, combatRound); }} style={npcPillStyle(activeCombatantId === actor.id)}>{actor.name}</button>)}</div>
        </section>

        <section style={flowPanelStyle}>
          <div style={quickSendHeaderStyle}><div><strong>Table flow shortcuts</strong><p>Fast buttons for moments where the screen needs to react before you type.</p></div><span style={safeBadgeStyle}><Sparkles size={13} /> Live pacing</span></div>
          <div style={presetGridStyle}>{FLOW_PRESETS.map(preset => { const Icon = preset.icon; return <button key={preset.id} type="button" onClick={() => sendFlowPreset(preset)} style={preset.id === 'blackout' ? dangerPresetButtonStyle : presetButtonStyle}><Icon size={15} /> {preset.label}</button>; })}</div>
        </section>

        <section style={bannerPanelStyle}>
          <div style={quickSendHeaderStyle}><div><strong>Overlay banner</strong><p>Flash a message over the current player screen without replacing the map, combat, or scene.</p></div><span style={safeBadgeStyle}><Sparkles size={13} /> Preserves current screen</span></div>
          <div style={messageInputRowStyle}><input value={bannerMessage} onChange={(event) => setBannerMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendBanner(); }} placeholder="Type a banner to overlay on the current screen..." style={inputStyle} /><button type="button" onClick={sendBanner} style={primaryButtonStyle}><Sparkles size={14} /> Send Banner</button><button type="button" onClick={() => publishBannerOverlay(null)} style={secondaryButtonStyle}><X size={14} /> Clear</button></div>
          <div style={presetGridStyle}>{BANNER_PRESETS.map(preset => <button key={preset.id} type="button" onClick={() => sendBannerPreset(preset)} style={preset.tone === 'danger' ? dangerPresetButtonStyle : presetButtonStyle}>{preset.label}</button>)}</div>
        </section>

        <section style={messagePanelStyle}>
          <div style={quickSendHeaderStyle}><div><strong>Broadcast announcement</strong><p>Send a full player-facing title card without digging into notes.</p></div><span style={safeBadgeStyle}><Send size={13} /> Full-screen broadcast</span></div>
          <div style={messageInputRowStyle}><input value={quickAnnouncement} onChange={(event) => setQuickAnnouncement(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendAnnouncement(); }} placeholder="Type a player-facing title card..." style={inputStyle} /><button type="button" onClick={sendAnnouncement} style={primaryButtonStyle}><Send size={14} /> Broadcast</button></div>
          <div style={presetGridStyle}>{MESSAGE_PRESETS.map(preset => <button key={preset.id} type="button" onClick={() => sendMessagePreset(preset)} style={presetButtonStyle}>{preset.label}</button>)}</div>
        </section>

        <section style={quickSendPanelStyle}>
          <div style={quickSendHeaderStyle}><div><strong>One-click display sends</strong><p>These update the player screen immediately.</p></div><span style={safeBadgeStyle}><ShieldCheck size={13} /> Player-safe output</span></div>
          <div style={presetGridStyle}>{SCENE_PRESETS.map(preset => { const Icon = preset.icon; return <button key={preset.id} type="button" onClick={() => sendPreset(preset)} style={presetButtonStyle}><Icon size={15} /> {preset.label}</button>; })}<button type="button" onClick={sendNpcGrid} style={presetButtonStyle}><Users size={15} /> NPC Grid ({selectedNpcs.length})</button></div>
        </section>

        {open && (
          <div style={advancedStyle}>
            <div style={formGridStyle}>
              <label style={fieldStyle}><span style={labelStyle}>Display title</span><input value={sceneTitle} onChange={(event) => setSceneTitle(event.target.value)} placeholder="Scene title" style={inputStyle} /></label>
              <label style={fieldStyle}><span style={labelStyle}>Caption / subtitle</span><input value={sceneSubtitle} onChange={(event) => setSceneSubtitle(event.target.value)} placeholder="Optional player-facing caption" style={inputStyle} /></label>
              <label style={fieldStyle}><span style={labelStyle}>Image / map URL</span><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Paste image/map URL or choose a map below" style={inputStyle} /></label>
              <label style={fieldStyle}><span style={labelStyle}>Saved map</span><select value="" onChange={(event) => { const map = maps.find(item => String(item.id) === event.target.value); if (map) { setSceneTitle(map.name || map.title || 'Map'); setImageUrl(imageFrom(map)); } }} style={inputStyle}><option value="">Choose saved map...</option>{maps.map(map => <option key={map.id} value={map.id}>{map.name || map.title || 'Untitled map'}</option>)}</select></label>
              <label style={fieldStyle}><span style={labelStyle}>Combat scenario</span><select value={selectedScenarioId} onChange={(event) => chooseScenario(event.target.value)} style={inputStyle}><option value="">Choose encounter...</option>{scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name || 'Unnamed encounter'}</option>)}</select></label>
            </div>

            <section style={sendRowStyle}>
              <button type="button" onClick={clearDisplay} style={secondaryButtonStyle}><X size={14} /> Blank</button>
              <button type="button" onClick={sendTitle} style={primaryButtonStyle}><Send size={14} /> Send Scene Title</button>
              <button type="button" onClick={sendImage} style={primaryButtonStyle}><ImageIcon size={14} /> Send Image / Map</button>
              <button type="button" onClick={sendNpcGrid} style={primaryButtonStyle}><Users size={14} /> Send NPC Grid ({selectedNpcs.length})</button>
              <button type="button" onClick={() => sendCombat(activeCombatantId, combatRound)} style={primaryButtonStyle}><Skull size={14} /> Send Combat HUD ({combatRosterOptions.length})</button>
            </section>

            <section style={controlGridStyle}>
              <section style={npcBoxStyle}>
                <div style={npcHeaderStyle}><strong>NPC portraits visible to players</strong><button type="button" onClick={() => setSelectedNpcIds([])} style={miniButtonStyle}><RefreshCw size={12} /> Clear</button></div>
                <div style={npcGridStyle}>{npcs.slice(0, 24).map(npc => <label key={npc.id} style={npcPillStyle(selectedNpcIds.includes(String(npc.id)))}><input type="checkbox" checked={selectedNpcIds.includes(String(npc.id))} onChange={() => toggleNpc(npc.id)} /><span>{npc.name || 'Unnamed NPC'}</span></label>)}{npcs.length === 0 && <p style={mutedStyle}>No NPCs found yet.</p>}</div>
              </section>

              <section style={npcBoxStyle}>
                <div style={npcHeaderStyle}><strong>Visible enemies/NPCs for combat display</strong><span style={combatToolbarStyle}><button type="button" onClick={selectAllCombatants} style={miniButtonStyle}>All</button><button type="button" onClick={clearCombatants} style={miniButtonStyle}>None</button></span></div>
                <p style={hintStyle}>The party is added automatically. Tick enemies/NPCs the players can currently see. Private notes and hidden creatures stay off the display.</p>
                <div style={npcGridStyle}>{playerFacingCombatants.map((combatant, index) => { const id = combatantId(combatant, index); const checked = visibleCombatantIds.includes(id); return <label key={id} style={npcPillStyle(checked)}><input type="checkbox" checked={checked} onChange={() => toggleCombatant(id)} /><span>{combatantName(combatant)}</span></label>; })}{playerFacingCombatants.length === 0 && <p style={mutedStyle}>Choose a combat scenario to reveal visible enemies/NPCs.</p>}</div>
              </section>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

const shellStyle = { background: theme.card, border: `1px solid ${theme.line}`, color: theme.text, fontFamily: fontStack, flexShrink: 0, boxShadow: '0 18px 54px rgba(0,0,0,0.22)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', padding: 12, background: `linear-gradient(135deg, ${theme.panel}, ${theme.card})` };
const iconStyle = { width: 38, height: 38, display: 'grid', placeItems: 'center', background: theme.bg, borderLeft: `5px solid ${theme.red}`, color: theme.text };
const eyebrowStyle = { margin: 0, color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: '2px 0 3px', color: theme.text, fontSize: 19, fontWeight: 950, lineHeight: 1.05 };
const subtitleStyle = { margin: 0, color: theme.soft, fontSize: 12, lineHeight: 1.4, maxWidth: 760 };
const actionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: theme.red, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: `1px solid ${theme.line}`, background: theme.bg, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const dangerButtonStyle = { minHeight: 34, border: `1px solid ${theme.red}`, background: '#090909', color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const statusStripStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderTop: `1px solid ${theme.line}`, borderBottom: `1px solid ${theme.line}`, background: theme.panel, color: theme.soft, fontSize: 11, lineHeight: 1.35 };
const bodyStyle = { display: 'grid', gap: 10, padding: 12 };
const commandDeckStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, alignItems: 'stretch' };
const targetGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 };
const targetButtonStyle = (active) => ({ minHeight: 116, display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr)', gap: '4px 9px', alignItems: 'start', textAlign: 'left', background: active ? theme.red : theme.bg, color: theme.text, border: active ? `1px solid ${theme.red}` : `1px solid ${theme.line}`, padding: 12, cursor: 'pointer', fontFamily: fontStack, fontWeight: 900, boxShadow: active ? '0 16px 38px rgba(208,0,0,0.22)' : 'none' });
const previewPanelStyle = { background: theme.panel, border: `1px solid ${theme.line}`, borderLeft: `6px solid ${theme.red}`, padding: 12, display: 'grid', alignContent: 'start', gap: 7, minWidth: 0 };
const previewTitleStyle = { color: theme.text, fontSize: 18, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const previewTextStyle = { color: theme.soft, fontSize: 12, lineHeight: 1.35 };
const previewMetaStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, color: theme.text, fontSize: 11, fontWeight: 900 };
const quickSendPanelStyle = { background: theme.panel, border: `1px solid ${theme.line}`, padding: 10, display: 'grid', gap: 9 };
const flowPanelStyle = { background: 'linear-gradient(135deg, rgba(208,0,0,0.16), rgba(36,36,36,0.96))', border: `1px solid ${theme.lineStrong}`, borderLeft: `6px solid ${theme.red}`, padding: 10, display: 'grid', gap: 9 };
const messagePanelStyle = { background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(36,36,36,0.96))', border: `1px solid ${theme.line}`, padding: 10, display: 'grid', gap: 9 };
const bannerPanelStyle = { background: 'linear-gradient(135deg, rgba(208,0,0,0.12), rgba(0,0,0,0.2), rgba(36,36,36,0.96))', border: `1px solid ${theme.lineStrong}`, borderLeft: `6px solid ${theme.red}`, padding: 10, display: 'grid', gap: 9 };
const combatCommanderStyle = { background: 'linear-gradient(135deg, rgba(208,0,0,0.2), rgba(8,8,8,0.34), rgba(36,36,36,0.96))', border: `1px solid ${theme.lineStrong}`, borderLeft: `7px solid ${theme.red}`, padding: 10, display: 'grid', gap: 9 };
const quickSendHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', color: theme.text };
const safeBadgeStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 26, padding: '0 8px', color: theme.text, background: theme.bg, border: `1px solid ${theme.line}`, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' };
const presetGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 7 };
const presetButtonStyle = { minHeight: 38, border: `1px solid ${theme.line}`, background: theme.card, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const dangerPresetButtonStyle = { minHeight: 38, border: `1px solid ${theme.red}`, background: '#090909', color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const messageInputRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 7 };
const turnRowStyle = { display: 'grid', gridTemplateColumns: '95px minmax(220px, 1fr) auto auto auto', gap: 7, alignItems: 'end' };
const miniFieldStyle = { display: 'grid', gap: 4, color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const wideFieldStyle = { display: 'grid', gap: 4, color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const combatActiveGridStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 110, overflowY: 'auto' };
const advancedStyle = { display: 'grid', gap: 10 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 };
const fieldStyle = { display: 'grid', gap: 5 };
const labelStyle = { color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { minHeight: 36, background: theme.bg, color: theme.text, border: `1px solid ${theme.lineStrong}`, padding: '0 8px', outline: 'none', fontFamily: fontStack };
const sendRowStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' };
const controlGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 };
const npcBoxStyle = { background: theme.panel, border: `1px solid ${theme.line}`, padding: 10 };
const npcHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8, color: theme.text };
const miniButtonStyle = { minHeight: 28, border: 0, background: theme.card, color: theme.text, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const npcGridStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 180, overflowY: 'auto' };
const npcPillStyle = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, background: active ? theme.red : theme.bg, color: theme.text, border: `1px solid ${active ? theme.red : theme.line}`, padding: '6px 8px', fontSize: 12, fontWeight: 850, cursor: 'pointer', fontFamily: fontStack });
const mutedStyle = { margin: 0, color: theme.muted, fontSize: 12 };
const hintStyle = { margin: '0 0 8px', color: theme.soft, fontSize: 12, lineHeight: 1.4 };
const combatToolbarStyle = { display: 'inline-flex', gap: 5 };

if (typeof document !== 'undefined' && !document.getElementById('rqk-player-display-controls-css')) {
  const style = document.createElement('style');
  style.id = 'rqk-player-display-controls-css';
  style.textContent = `
    [data-testid="live-player-display-controls"] button { transition: transform 160ms ease, filter 160ms ease, border-color 160ms ease; }
    [data-testid="live-player-display-controls"] button:hover { transform: translateY(-1px); filter: brightness(1.08); }
    [data-testid="live-player-display-controls"] small { display: block; color: rgba(255,255,255,0.72); font-size: 11px; margin-top: 2px; }
    [data-testid="live-player-display-controls"] em { grid-column: 1 / -1; color: rgba(255,255,255,0.72); font-style: normal; font-size: 12px; line-height: 1.35; }
    [data-testid="live-player-display-controls"] p { margin: 2px 0 0; color: rgba(255,255,255,0.68); font-size: 12px; }
    @media (max-width: 980px) { [data-testid="live-player-display-controls"] [data-testid="player-display-target-selector"] { grid-template-columns: 1fr !important; } }
    @media (max-width: 760px) { [data-testid="combat-display-commander"] div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; } }
    @media (max-width: 640px) { [data-testid="live-player-display-controls"] input + button { width: 100%; justify-content: center; } }
  `;
  document.head.appendChild(style);
}
