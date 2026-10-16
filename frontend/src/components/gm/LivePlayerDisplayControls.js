import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Eye, Image as ImageIcon, Layers, Monitor, Projector, RefreshCw, Send, ShieldCheck, Skull, Sparkles, Table2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { createDisplayState, loadDisplayState } from '@/lib/liveDisplayBus';
import { publishCampaignDisplayStateWithStatus } from '@/lib/liveDisplayPublishStatus';
import { loadPlayerDisplayResources, playerDisplayResourceWarning } from '@/lib/livePlayerDisplayResources';
import { normalizeCampaignCharacter } from '@/data/campaignCharacterBridge';
import { isPointRevealed, loadFog, normaliseFog, saveFog } from '@/lib/fogOfWar';
import FogOfWarEditor from '@/components/gm/FogOfWarEditor';
import { loadTactical, normaliseTactical, publicTactical, saveTactical } from '@/lib/vttTacticalOverlay';
import { loadEncounterPresets, saveEncounterPresets, normaliseTokenPositions, normaliseManualTokens } from '@/lib/vttEncounterPresets';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: 'var(--rq-bg, #071522)',
  panel: 'var(--rq-surface, #0C2234)',
  card: 'var(--rq-card, #112A40)',
  hover: 'var(--rq-card-hover, #17364F)',
  line: 'var(--rq-line, rgba(214,168,79,0.18))',
  lineStrong: 'var(--rq-line-strong, rgba(214,168,79,0.42))',
  pink: 'var(--rq-primary, #D6A84F)',
  blue: 'var(--rq-secondary, #79BCE8)',
  red: 'var(--rq-primary, #D6A84F)',
  text: 'var(--rq-text-primary)',
  soft: 'var(--rq-text-primary)',
  muted: 'var(--rq-text-primary)',
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
  // Offline world maps carry image_data. Prefer the real embedded picture over a
  // stale remote URL, which would otherwise render as a missing image on TV.
  if (typeof item?.image_data === 'string' && item.image_data.startsWith('data:image/')) return item.image_data;
  return item?.image_url || item?.map_url || item?.url || item?.attachment_url || item?.avatar_url || item?.portrait_url || item?.portraitUrl || item?.imageUrl || item?.token_url || item?.character_image || item?.character_portrait || item?.image_data || '';
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
  const initiative = safeNumber(item.initiative, item.initiative_bonus, item.init);
  return {
    id,
    type,
    name: combatantName(item),
    subtitle: item.subtitle || item.creature_type || item.role || (type === 'npc' ? 'NPC' : 'Enemy'),
    image_url: imageFrom(item),
    x: safeNumber(item.x, item.position?.x, item.token_x),
    y: safeNumber(item.y, item.position?.y, item.token_y),
    // Never send enemy/NPC HP or AC to the player-facing screen.
    initiative,
    initiativeLabel: signed(initiative),
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
  const [worldMaps, setWorldMaps] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [party, setParty] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [resourceWarning, setResourceWarning] = useState('');
  const [refreshingResources, setRefreshingResources] = useState(false);
  const [sceneTitle, setSceneTitle] = useState(campaignName || 'Scene');
  const [sceneSubtitle, setSceneSubtitle] = useState('');
  const [quickAnnouncement, setQuickAnnouncement] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fog, setFog] = useState({ enabled: false, reveals: [] });
  const [tactical, setTactical] = useState({ grid: false, columns: 24, ruler: null, showRuler: false });
  const [tokenPositions, setTokenPositions] = useState({});
  const [manualTokens, setManualTokens] = useState([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [snapTokens, setSnapTokens] = useState(false);
  const [encounterName, setEncounterName] = useState('');
  const [savedEncounters, setSavedEncounters] = useState(() => loadEncounterPresets(campaignId));
  const [selectedEncounterId, setSelectedEncounterId] = useState('');
  const [selectedNpcIds, setSelectedNpcIds] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [visibleCombatantIds, setVisibleCombatantIds] = useState([]);
  const [combatRound, setCombatRound] = useState(1);
  const [activeCombatantId, setActiveCombatantId] = useState('');
  const [displayTarget, setDisplayTarget] = useState(() => loadTarget(campaignId));

  const applyResourceResult = useCallback(({ data, failures }) => {
    if (Object.prototype.hasOwnProperty.call(data, 'maps')) setMaps(data.maps);
    if (Object.prototype.hasOwnProperty.call(data, 'worldMaps')) setWorldMaps(data.worldMaps);
    if (Object.prototype.hasOwnProperty.call(data, 'npcs')) setNpcs(data.npcs);
    if (Object.prototype.hasOwnProperty.call(data, 'scenarios')) setScenarios(data.scenarios);
    if (Object.prototype.hasOwnProperty.call(data, 'players')) {
      const members = data.players.map(normalisePartyMember).filter(member => member?.name);
      setParty(members);
      setActiveCombatantId(current => current || (members[0]?.id ? `player-${members[0].id}` : ''));
    }
    const warning = playerDisplayResourceWarning(failures);
    setResourceWarning(warning);
    return warning;
  }, []);

  useEffect(() => {
    try { localStorage.setItem(targetStorageKey(campaignId), displayTarget); } catch { /* preference storage is optional */ }
  }, [campaignId, displayTarget]);

  useEffect(() => {
    setMaps([]);
    setWorldMaps([]);
    setNpcs([]);
    setParty([]);
    setScenarios([]);
    setSelectedNpcIds([]);
    setSelectedScenarioId('');
    setVisibleCombatantIds([]);
    setTokenPositions({});
    setManualTokens([]);
    setNewTokenName('');
    setSnapTokens(false);
    setSavedEncounters(loadEncounterPresets(campaignId));
    setSelectedEncounterId('');
    setActiveCombatantId('');
    setResourceWarning('');
    setDisplayTarget(loadTarget(campaignId));
    if (!campaignId) return undefined;

    let cancelled = false;
    loadPlayerDisplayResources(apiClient, campaignId).then((result) => {
      if (!cancelled) applyResourceResult(result);
    });
    return () => { cancelled = true; };
  }, [campaignId, applyResourceResult]);

  const refreshResources = useCallback(async () => {
    if (!campaignId) return;
    setRefreshingResources(true);
    try {
      const result = await loadPlayerDisplayResources(apiClient, campaignId);
      const warning = applyResourceResult(result);
      if (warning) toast.warning('Player display data only partly refreshed', { description: warning });
      else toast.success('Player display data refreshed');
    } finally {
      setRefreshingResources(false);
    }
  }, [campaignId, applyResourceResult]);

  const displayUrlFor = (targetId = displayTarget) => `/campaign/${campaignId}/player-display?target=${encodeURIComponent(normaliseTarget(targetId))}`;
  const selectedNpcs = useMemo(() => npcs.filter(npc => selectedNpcIds.includes(String(npc.id))), [npcs, selectedNpcIds]);
  const allMaps = useMemo(() => [...maps, ...worldMaps], [maps, worldMaps]);
  const selectedScenario = useMemo(() => scenarios.find(scenario => String(scenario.id) === String(selectedScenarioId)), [scenarios, selectedScenarioId]);
  const activeMapUrl = imageUrl.trim() || imageFrom(selectedScenario);
  useEffect(() => {
    setFog(loadFog(campaignId, activeMapUrl));
    setTactical(loadTactical(campaignId, activeMapUrl));
  }, [campaignId, activeMapUrl]);
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
  const combatTokenPayload = useMemo(() => [
    ...visibleCombatantEntries.map(({ item, id }) => ({ ...normaliseCombatantPayload(item, id), ...(tokenPositions[id] || {}) })),
    ...manualTokens.filter(token => token.visible).map(token => ({ ...token, ...(tokenPositions[token.id] || {}), visible: undefined })),
  ], [visibleCombatantEntries, manualTokens, tokenPositions]);
  const gmEditorTokens = useMemo(() => [
    ...playerFacingCombatants.map((item, index) => { const id = combatantId(item, index); return { ...normaliseCombatantPayload(item, id), ...(tokenPositions[id] || {}), visible: visibleCombatantIds.includes(id) }; }),
    ...manualTokens.map(token => ({ ...token, ...(tokenPositions[token.id] || {}) })),
  ], [playerFacingCombatants, manualTokens, tokenPositions, visibleCombatantIds]);
  const combatRosterOptions = useMemo(() => [
    ...partyPayload.map(member => ({ id: `player-${member.id}`, name: member.name, type: 'player', initiative: member.initiative || 0, label: `${member.name} · Player ${member.initiativeLabel || signed(member.initiative)}` })),
    ...combatTokenPayload.map(token => ({ id: token.id, name: token.name, type: token.type, initiative: token.initiative || 0, label: `${token.name} · ${token.type === 'npc' ? 'NPC' : 'Enemy'} ${token.initiativeLabel || signed(token.initiative)}` })),
  ].sort((a, b) => Number(b.initiative || 0) - Number(a.initiative || 0)), [partyPayload, combatTokenPayload]);
  const currentTarget = DISPLAY_TARGETS.find(target => target.id === displayTarget) || DISPLAY_TARGETS[0];

  const publish = async (mode, payload = {}, targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    const label = DISPLAY_TARGETS.find(target => target.id === safeTarget)?.label || currentTarget.label;
    const result = await publishCampaignDisplayStateWithStatus(campaignId, createDisplayState(mode, { ...payload, display_target: safeTarget }));
    if (result.remoteSynced || window.rookieDesktop?.offline) {
      toast.success('Sent to player display', { description: window.rookieDesktop?.offline ? 'Local laptop + Wi-Fi player view' : label });
    } else {
      toast.warning('Updated locally — remote display not synced', { description: `${label} is updated in this browser. Another device will catch up when sync reconnects.` });
    }
    return result;
  };

  const publishBannerOverlay = async (banner) => {
    const current = loadDisplayState(campaignId) || createDisplayState('blank', {});
    const mode = current?.mode || 'blank';
    const payload = { ...(current?.payload || {}) };
    const safeTarget = normaliseTarget(displayTarget || payload.display_target);
    if (banner) payload.banner = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, eyebrow: 'Announcement', ...banner };
    else delete payload.banner;
    const result = await publishCampaignDisplayStateWithStatus(campaignId, createDisplayState(mode, { ...payload, display_target: safeTarget }));
    const label = DISPLAY_TARGETS.find(target => target.id === safeTarget)?.label || currentTarget.label;
    if (result.remoteSynced || window.rookieDesktop?.offline) {
      toast.success(banner ? 'Banner sent over current display' : 'Banner cleared', { description: label });
    } else {
      toast.warning('Updated locally — remote display not synced', { description: `${label} changed in this browser. Another device will catch up when sync reconnects.` });
    }
    return result;
  };

  const sendDisplayTarget = async (targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    const target = DISPLAY_TARGETS.find(item => item.id === safeTarget) || DISPLAY_TARGETS[0];
    const result = await publishCampaignDisplayStateWithStatus(campaignId, createDisplayState('blank', {
      title: target.label,
      subtitle: target.help,
      display_target: target.id,
    }));
    if (result.remoteSynced || window.rookieDesktop?.offline) {
      toast.success(`Display set for ${target.label}`);
    } else {
      toast.warning('Display set locally — remote display not synced', { description: `${target.label} is ready in this browser. Another device will catch up when sync reconnects.` });
    }
    return result;
  };

  const openPlayerDisplay = (targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    setDisplayTarget(safeTarget);
    void sendDisplayTarget(safeTarget);
    const opened = window.open(displayUrlFor(safeTarget), '_blank', 'noopener,noreferrer');
    // Electron creates the second BrowserWindow via setWindowOpenHandler and
    // noopener intentionally returns null even when the window opened.
    if (!opened && !window.rookieDesktop?.offline) toast.error('The display tab was blocked. Allow pop-ups, then try again.');
  };

  const copyDisplayLink = async (targetId = displayTarget) => {
    const safeTarget = normaliseTarget(targetId);
    let url = `${window.location.origin}${displayUrlFor(safeTarget)}`;
    if (window.rookieDesktop?.offline && window.rookieDesktop?.getLanDisplayLink) {
      const result = await window.rookieDesktop.getLanDisplayLink();
      if (!result?.url) { toast.error(result?.error || 'Could not open the Wi-Fi display'); return; }
      url = result.url;
      if (url.includes('127.0.0.1')) toast.warning('No Wi-Fi address found: check the laptop is on the same network as the TV.');
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Player display link copied', { description: window.rookieDesktop?.offline ? 'Open it in a browser on a device using the same Wi-Fi.' : 'Player display link ready.' });
    } catch {
      toast.info(url, { duration: 12000 });
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
      fog: normaliseFog(fog),
      tactical: publicTactical(tactical),
    });
  };

  const sendNpcGrid = (overrideNpcs) => {
    // React onClick sends an event; only an actual NPC array can override selection.
    const reveal = Array.isArray(overrideNpcs) ? overrideNpcs : selectedNpcs;
    if (reveal.length === 0) { toast.error('Select at least one NPC first'); return; }
    publish('npc-grid', {
      title: sceneTitle || 'Who you can see',
      eyebrow: 'People in the scene',
      party: partyPayload,
      npcs: reveal.map(npc => ({
        id: npc.id,
        name: npc.name,
        subtitle: npc.role || npc.race || npc.location || '',
        // Portrait reveals must not accidentally publish private GM NPC notes.
        description: npc.public_description || '',
        image_url: imageFrom(npc),
      })),
    });
  };

  const sendLaptopMap = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 25 * 1024 * 1024) {
      toast.error('Choose a PNG, JPG or WebP map smaller than 25 MB'); return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error('Could not read that map file');
    reader.onload = () => {
      const picture = new Image();
      picture.onerror = () => toast.error('Could not decode that map image');
      picture.onload = async () => {
        try {
          const scale = Math.min(1, 2600 / Math.max(picture.width, picture.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(picture.width * scale));
          canvas.height = Math.max(1, Math.round(picture.height * scale));
          canvas.getContext('2d').drawImage(picture, 0, 0, canvas.width, canvas.height);
          let url = canvas.toDataURL('image/jpeg', 0.83);
          if (window.rookieDesktop?.storeLocalMapImage) {
            const saved = await window.rookieDesktop.storeLocalMapImage(url);
            if (!saved?.url) throw new Error('Could not save that map locally.');
            url = saved.url;
          } else if (url.length > 4.5 * 1024 * 1024) {
            toast.error('Map is too large after resizing; try a smaller image');
            return;
          }
          setImageUrl(url);
          void publish('image', { title: file.name.replace(/\.[^.]+$/, '') || 'Map', image_url: url, party: partyPayload, fog: loadFog(campaignId, url), tactical: publicTactical(loadTactical(campaignId, url)) });
        } catch { toast.error('Could not prepare the map for display'); }
      };
      picture.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const combatPayload = (activeId = activeCombatantId, roundValue = combatRound, fogValue = fog, tacticalValue = tactical, positions = tokenPositions) => ({
    title: selectedScenario?.name || sceneTitle || 'Combat',
    map_url: imageUrl.trim() || imageFrom(selectedScenario),
    caption: sceneSubtitle,
    round: Math.max(1, Number(roundValue) || 1),
    active_id: activeId || combatRosterOptions[0]?.id || '',
    // Only character HP is public during combat; other character sheet stats stay with the GM.
    party: partyPayload.map(({ id, name, className, imageUrl, hp, maxHp, hpPercent, hpStatus, initiative, initiativeLabel }) => ({
      id, name, className, imageUrl, hp, maxHp, hpPercent, hpStatus, initiative, initiativeLabel,
    })),
    fog: normaliseFog(fogValue),
    tactical: publicTactical(tacticalValue),
    // Fog-hidden creatures must not appear in player roster or raw LAN state.
    tokens: combatTokenPayload.map(token => ({ ...token, ...(positions[token.id] || {}) })).filter(token => !fogValue?.enabled || ((Number(token.x) || Number(token.y)) && isPointRevealed(fogValue, token.x, token.y))),
  });

  const updateFog = (nextFog) => {
    if (!activeMapUrl) return;
    const safe = normaliseFog(nextFog);
    setFog(safe);
    try { saveFog(campaignId, activeMapUrl, safe); }
    catch { toast.warning('Could not save fog for this map'); }
    const current = loadDisplayState(campaignId);
    const displayedUrl = current?.mode === 'combat' ? current.payload?.map_url : current?.mode === 'image' ? current.payload?.image_url : '';
    if (displayedUrl !== activeMapUrl) return;
    // Keep live reveals silent. The player screen updates with each GM click.
    const nextPayload = current.mode === 'combat' ? combatPayload(activeCombatantId, combatRound, safe) : { ...current.payload, fog: safe };
    void publishCampaignDisplayStateWithStatus(campaignId, createDisplayState(current.mode, { ...nextPayload, display_target: displayTarget }));
  };

  const updateTactical = (nextTactical) => {
    if (!activeMapUrl) return;
    const safe = normaliseTactical(nextTactical);
    setTactical(safe);
    try { saveTactical(campaignId, activeMapUrl, safe); }
    catch { toast.warning('Could not save ruler and grid settings'); }
    const current = loadDisplayState(campaignId);
    const displayedUrl = current?.mode === 'combat' ? current.payload?.map_url : current?.mode === 'image' ? current.payload?.image_url : '';
    if (displayedUrl !== activeMapUrl) return;
    const payload = current.mode === 'combat'
      ? combatPayload(activeCombatantId, combatRound, fog, safe)
      : { ...current.payload, tactical: publicTactical(safe) };
    void publishCampaignDisplayStateWithStatus(campaignId, createDisplayState(current.mode, { ...payload, display_target: displayTarget }));
  };

  const updateTokenPosition = (id, point) => {
    if (!activeMapUrl) return;
    const next = normaliseTokenPositions({ [id]: point })[id];
    if (!next) return;
    const nextPositions = { ...tokenPositions, [id]: next };
    setTokenPositions(nextPositions);
    const current = loadDisplayState(campaignId);
    if (current?.mode !== 'combat' || current.payload?.map_url !== activeMapUrl) return;
    const payload = combatPayload(activeCombatantId, combatRound, fog, tactical, nextPositions);
    void publishCampaignDisplayStateWithStatus(campaignId, createDisplayState('combat', { ...payload, display_target: displayTarget }));
  };

  const saveEncounter = () => {
    const name = encounterName.trim() || sceneTitle.trim() || 'Saved Encounter';
    if (!activeMapUrl) { toast.error('Choose a map before saving the encounter'); return; }
    if (activeMapUrl.length > 900000) { toast.error('Map too large to save here. Use a Keeper local map first.'); return; }
    const entry = {
      id: 'gm-scene-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      name, mapUrl: activeMapUrl, sceneTitle, sceneSubtitle,
      scenarioId: selectedScenarioId, visibleIds: visibleCombatantIds, tokenPositions, manualTokens,
      round: combatRound, activeId: activeCombatantId, fog, tactical, snap: snapTokens,
    };
    try {
      const existing = savedEncounters.filter(item => item.name !== name);
      const next = saveEncounterPresets(campaignId, [entry, ...existing]);
      setSavedEncounters(next);
      setSelectedEncounterId(next[0].id);
      toast.success('Encounter saved privately on this laptop');
    } catch { toast.error('Could not save encounter. Check local storage space.'); }
  };

  const loadEncounter = () => {
    const item = savedEncounters.find(scene => scene.id === selectedEncounterId);
    if (!item) { toast.error('Choose a saved encounter'); return; }
    if (item.mapUrl) {
      // Restoring a saved scene is a deliberate GM action: restore its map fog and grid too.
      try {
        saveFog(campaignId, item.mapUrl, item.fog);
        saveTactical(campaignId, item.mapUrl, item.tactical);
      } catch { toast.warning('Map preferences could not be saved'); }
    }
    setImageUrl(item.mapUrl);
    setSceneTitle(item.sceneTitle || item.name);
    setSceneSubtitle(item.sceneSubtitle || '');
    setSelectedScenarioId(item.scenarioId);
    setVisibleCombatantIds(item.visibleIds);
    setTokenPositions(item.tokenPositions);
    setManualTokens(normaliseManualTokens(item.manualTokens));
    setCombatRound(item.round);
    setActiveCombatantId(item.activeId);
    setFog(item.fog);
    setTactical(item.tactical);
    setSnapTokens(item.snap);
    toast.success('Encounter restored to GM preview. Click Start / Update Combat HUD when ready.');
  };

  const deleteEncounter = () => {
    if (!selectedEncounterId) return;
    try {
      const next = saveEncounterPresets(campaignId, savedEncounters.filter(x => x.id !== selectedEncounterId));
      setSavedEncounters(next);
      setSelectedEncounterId('');
      toast.success('Saved encounter removed');
    } catch { toast.error('Could not delete encounter'); }
  };

  const sendBattleStart = () => publish('battle-start', {
    title: 'Battle Starting',
    subtitle: 'Roll initiative!',
    party: partyPayload.map(({ id, name, className, imageUrl, hp, maxHp, hpPercent, hpStatus }) => ({
      id, name, className, imageUrl, hp, maxHp, hpPercent, hpStatus,
    })),
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
    setTokenPositions({});
    setManualTokens([]);
    setCombatRound(1);
    setActiveCombatantId(party[0]?.id ? `player-${party[0].id}` : nextIds[0] || '');
    if (scenario) {
      setSceneTitle(scenario.name || 'Combat');
      const scenarioMap = imageFrom(scenario);
      if (scenarioMap) setImageUrl(scenarioMap);
    }
  };

  const toggleCombatant = (id) => setVisibleCombatantIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const toggleEditorToken = (id) => {
    if (String(id).startsWith('gm-custom-')) {
      setManualTokens(prev => prev.map(token => token.id === id ? { ...token, visible: !token.visible } : token));
    } else toggleCombatant(id);
  };
  const addManualToken = () => {
    const name = newTokenName.trim().slice(0,100);
    if (!name) { toast.error('Give the creature a name first'); return; }
    if (!activeMapUrl) { toast.error('Choose a map before adding a token'); return; }
    if (manualTokens.length >= 80) { toast.error('This battle has reached its token limit'); return; }
    const token = { id: 'gm-custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7), name, type: 'enemy', x:50, y:50, visible:false };
    setManualTokens(prev => [...prev, token]);
    setNewTokenName('');
    toast.info('Token added to the GM map, hidden from players until revealed');
  };
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
          <button type="button" onClick={() => copyDisplayLink(displayTarget)} style={secondaryButtonStyle}><Copy size={14} /> {window.rookieDesktop?.offline ? 'Copy Wi-Fi Link' : 'Copy Link'}</button>
          <button type="button" onClick={refreshResources} disabled={refreshingResources} style={secondaryButtonStyle}><RefreshCw size={14} /> {refreshingResources ? 'Refreshing…' : 'Refresh Data'}</button>
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

      {resourceWarning && (
        <div role="status" data-testid="player-display-resource-warning" style={warningStyle}>
          <AlertTriangle size={14} /> <span>{resourceWarning}</span>
        </div>
      )}

      <div style={bodyStyle}>
        <section style={npcBoxStyle} data-testid="display-npc-multiselect">
          <div style={npcHeaderStyle}>
            <div><strong>Show NPCs together</strong><p style={hintStyle}>Tick as many NPCs as you need, then reveal them all in one go.</p></div>
            <span style={combatToolbarStyle}>
              <button type="button" onClick={() => setSelectedNpcIds(npcs.map(npc => String(npc.id)))} style={miniButtonStyle}>Select All</button>
              <button type="button" onClick={() => setSelectedNpcIds([])} style={miniButtonStyle}>Clear</button>
              <button type="button" disabled={!npcs.length} onClick={() => sendNpcGrid(npcs)} style={miniButtonStyle}><Users size={13} /> Show All</button>
              <button type="button" disabled={!selectedNpcs.length} onClick={sendNpcGrid} style={primaryButtonStyle}><Users size={14} /> Show Selected ({selectedNpcs.length})</button>
            </span>
          </div>
          <div style={npcGridStyle}>
            {npcs.map(npc => <label key={npc.id} style={npcPillStyle(selectedNpcIds.includes(String(npc.id)))}><input type="checkbox" checked={selectedNpcIds.includes(String(npc.id))} onChange={() => toggleNpc(npc.id)} /><span>{npc.name || 'Unnamed NPC'}</span></label>)}
            {npcs.length === 0 && <p style={mutedStyle}>No NPCs found yet. Add NPCs in Campaign Prep, then press Refresh Data.</p>}
          </div>
        </section>
        <section style={quickSendPanelStyle}>
          <div style={quickSendHeaderStyle}><div><strong>Show a map from this laptop</strong><p>Works offline. The image is resized and sent straight to the TV/table — no upload service required.</p></div><span style={safeBadgeStyle}><ImageIcon size={13} /> Local image</span></div>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Choose a local battle or world map" onChange={event => { sendLaptopMap(event.target.files?.[0]); event.target.value = ''; }} style={{ ...inputStyle, paddingTop: 7 }} />
        </section>
        <section data-testid="vtt-saved-encounters" style={combatCommanderStyle}>
          <div style={quickSendHeaderStyle}><div><strong>Saved Battle Scenes</strong><p>Keep map, monsters, token positions, fog, grid, ruler and combat round together. Loading is GM-only until you send it to players.</p></div><span style={safeBadgeStyle}><Layers size={13} /> {savedEncounters.length} saved</span></div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
            <input aria-label="Encounter scene name" value={encounterName} onChange={e=>setEncounterName(e.target.value)} placeholder="Encounter name, e.g. The Crypt" style={{ ...inputStyle, flex:'1 1 160px' }} />
            <button type="button" onClick={saveEncounter} style={primaryButtonStyle}>Save This Battle</button>
            <select aria-label="Saved encounter" value={selectedEncounterId} onChange={e=>setSelectedEncounterId(e.target.value)} style={{ ...inputStyle, flex:'1 1 210px' }}>
              <option value="">Choose saved battle...</option>
              {savedEncounters.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
            <button type="button" disabled={!selectedEncounterId} onClick={loadEncounter} style={secondaryButtonStyle}>Load to GM Preview</button>
            <button type="button" disabled={!selectedEncounterId} onClick={deleteEncounter} style={dangerButtonStyle}>Delete</button>
          </div>
        </section>
        <section data-testid="vtt-manual-token-tools" style={combatCommanderStyle}>
          <div style={quickSendHeaderStyle}><strong>Creature Tokens</strong><span style={safeBadgeStyle}>{gmEditorTokens.length} creature(s) prepared</span></div>
          <p style={hintStyle}>Create a creature even without a saved combat scenario. It begins hidden from players. Double-click its map token to reveal it, or use the control below.</p>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            <input aria-label="New creature token name" value={newTokenName} onChange={e=>setNewTokenName(e.target.value)}
              placeholder="Creature name, e.g. Skeleton 1" style={{ ...inputStyle, flex:'1 1 200px' }} />
            <button type="button" onClick={addManualToken} style={primaryButtonStyle}>Add Creature Token</button>
          </div>
          {!!manualTokens.length && <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {manualTokens.map(token=><span key={token.id} style={{ display:'inline-flex',gap:6,alignItems:'center',padding:5,border:`1px solid ${theme.lineStrong}`,fontSize:12 }}>
              <strong>{token.name}</strong>
              <button type="button" style={miniButtonStyle} onClick={()=>toggleEditorToken(token.id)}>{token.visible ? 'Visible' : 'Hidden'}</button>
              <button type="button" style={miniButtonStyle} aria-label={`Remove ${token.name}`} onClick={()=>setManualTokens(prev=>prev.filter(t=>t.id!==token.id))}>Remove</button>
            </span>)}
          </div>}
        </section>
        <FogOfWarEditor mapUrl={activeMapUrl} fog={fog} onChange={updateFog} tactical={tactical} onTacticalChange={updateTactical}
          tokens={gmEditorTokens} onTokenMove={updateTokenPosition} onTokenVisibilityChange={toggleEditorToken}
          snap={snapTokens} onSnapChange={setSnapTokens} />
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
              <span><Layers size={12} /> {allMaps.length} maps</span>
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
            <button type="button" onClick={sendBattleStart} style={dangerPresetButtonStyle}><Skull size={14} /> Battle Starting!</button>
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
              <label style={fieldStyle}><span style={labelStyle}>Saved map</span><select value="" onChange={(event) => { const map = allMaps.find(item => String(item.id) === event.target.value); if (map) { setSceneTitle(map.name || map.title || 'Map'); setImageUrl(imageFrom(map)); } }} style={inputStyle}><option value="">Choose saved map...</option>{allMaps.map(map => <option key={map.id} value={map.id}>{map.name || map.title || 'Untitled map'}</option>)}</select></label>
              <label style={fieldStyle}><span style={labelStyle}>Combat scenario</span><select value={selectedScenarioId} onChange={(event) => chooseScenario(event.target.value)} style={inputStyle}><option value="">Choose encounter...</option>{scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name || 'Unnamed encounter'}</option>)}</select></label>
            </div>

            <section style={sendRowStyle}>
              <button type="button" onClick={clearDisplay} style={secondaryButtonStyle}><X size={14} /> Blank</button>
              <button type="button" onClick={sendTitle} style={primaryButtonStyle}><Send size={14} /> Send Scene Title</button>
              <button type="button" onClick={sendImage} style={primaryButtonStyle}><ImageIcon size={14} /> Send Image / Map</button>
              <button type="button" onClick={sendNpcGrid} style={primaryButtonStyle}><Users size={14} /> Send NPC Grid ({selectedNpcs.length})</button>
              <button type="button" onClick={sendBattleStart} style={dangerPresetButtonStyle}><Skull size={14} /> Battle Starting!</button>
            <button type="button" onClick={() => sendCombat(activeCombatantId, combatRound)} style={primaryButtonStyle}><Skull size={14} /> Send Combat HUD ({combatRosterOptions.length})</button>
            </section>

            <section style={controlGridStyle}>
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
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', padding: 12, background: theme.panel };
const iconStyle = { width: 38, height: 38, display: 'grid', placeItems: 'center', background: theme.bg, borderLeft: `1px solid ${theme.pink}`, color: theme.text };
const eyebrowStyle = { margin: 0, color: theme.muted, fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: '2px 0 3px', color: theme.text, fontSize: 19, fontWeight: 950, lineHeight: 1.05 };
const subtitleStyle = { margin: 0, color: theme.soft, fontSize: 12, lineHeight: 1.4, maxWidth: 760 };
const actionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' };
const primaryButtonStyle = { minHeight: 34, border: `1px solid ${theme.pink}`, background: theme.card, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 34, border: `1px solid ${theme.line}`, background: theme.bg, color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const dangerButtonStyle = { minHeight: 34, border: `1px solid ${theme.red}`, background: '#090909', color: theme.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const statusStripStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderTop: `1px solid ${theme.line}`, borderBottom: `1px solid ${theme.line}`, background: theme.panel, color: theme.soft, fontSize: 11, lineHeight: 1.35 };
const warningStyle = { display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 12px', borderBottom: '1px solid rgba(245,158,11,0.42)', background: 'rgba(245,158,11,0.08)', color: theme.soft, fontSize: 11, lineHeight: 1.4 };
const bodyStyle = { display: 'grid', gap: 10, padding: 12 };
const commandDeckStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, alignItems: 'stretch' };
const targetGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 };
const targetButtonStyle = (active) => ({ minHeight: 116, display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr)', gap: '4px 9px', alignItems: 'start', textAlign: 'left', background: active ? theme.red : theme.bg, color: theme.text, border: active ? `1px solid ${theme.red}` : `1px solid ${theme.line}`, padding: 12, cursor: 'pointer', fontFamily: fontStack, fontWeight: 900, boxShadow: 'none' });
const previewPanelStyle = { background: theme.panel, border: `1px solid ${theme.line}`, borderLeft: `1px solid ${theme.pink}`, padding: 12, display: 'grid', alignContent: 'start', gap: 7, minWidth: 0 };
const previewTitleStyle = { color: theme.text, fontSize: 18, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const previewTextStyle = { color: theme.soft, fontSize: 12, lineHeight: 1.35 };
const previewMetaStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, color: theme.text, fontSize: 11, fontWeight: 900 };
const quickSendPanelStyle = { background: theme.panel, border: `1px solid ${theme.line}`, padding: 10, display: 'grid', gap: 9 };
const flowPanelStyle = { background: theme.panel, border: `1px solid ${theme.lineStrong}`, borderLeft: `1px solid ${theme.pink}`, padding: 10, display: 'grid', gap: 9 };
const messagePanelStyle = { background: theme.panel, border: `1px solid ${theme.line}`, padding: 10, display: 'grid', gap: 9 };
const bannerPanelStyle = { background: theme.panel, border: `1px solid ${theme.lineStrong}`, borderLeft: `1px solid ${theme.pink}`, padding: 10, display: 'grid', gap: 9 };
const combatCommanderStyle = { background: theme.panel, border: `1px solid ${theme.lineStrong}`, borderLeft: `1px solid ${theme.pink}`, padding: 10, display: 'grid', gap: 9 };
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
