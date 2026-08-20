import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, Dices, Eye, EyeOff, Heart, Map, Package,
  Play, Plus, RotateCcw, Shield, SkipForward, Skull, Swords, Trash2,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import NPCCombatRecruiter from '@/components/NPCCombatRecruiter';
import MapCanvas from '@/components/MapBuilder/MapCanvas';
import TargetedAttackPanel from '@/components/gm/TargetedAttackPanel';
import { createDisplayState, publishCampaignDisplayState, publishDisplayState } from '@/lib/liveDisplayBus';
import {
  combatStateSnapshot,
  queueOfflineCombatClose,
  queueOfflineCombatState,
} from '@/offline/offlineCombatSyncQueue';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.76)', muted: 'rgba(255,255,255,0.56)', line: 'rgba(255,255,255,0.16)',
  green: '#22c55e', amber: '#f59e0b', danger: '#ef4444',
};

const CONDITIONS = [
  ['blinded', 'Blind'], ['charmed', 'Charm'], ['frightened', 'Fear'], ['grappled', 'Grap'],
  ['incapacitated', 'Incap'], ['invisible', 'Invis'], ['paralyzed', 'Para'], ['poisoned', 'Pois'],
  ['prone', 'Prone'], ['restrained', 'Rest'], ['stunned', 'Stun'], ['unconscious', 'Uncon'],
  ['concentrating', 'Conc'], ['hasted', 'Haste'], ['raging', 'Rage'], ['hexed', 'Hex'],
];

const numberOr = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const safeArray = value => Array.isArray(value) ? value : [];

function initialiseCombatant(source, index) {
  const maxHp = Math.max(1, numberOr(source.maxHp ?? source.max_hp ?? source.hit_points ?? source.hp, 10));
  const hp = Math.max(0, Math.min(maxHp, numberOr(source.hp ?? source.current_hit_points, maxHp)));
  const initiativeRoll = numberOr(source.initiativeRoll, Math.floor(Math.random() * 20) + 1);
  const initiativeMod = numberOr(source.initiativeMod ?? source.initiative_bonus, 0);
  return {
    ...source,
    id: source.id || `combatant-${Date.now()}-${index}`,
    name: source.name || `Combatant ${index + 1}`,
    type: source.type || 'enemy',
    hp,
    maxHp,
    tempHp: Math.max(0, numberOr(source.tempHp ?? source.temporary_hit_points ?? source.temp_hp, 0)),
    ac: numberOr(source.ac ?? source.armor_class, 10),
    initiativeRoll,
    initiativeMod,
    initiative: numberOr(source.initiative, initiativeRoll + initiativeMod),
    conditions: safeArray(source.conditions),
    deathSaves: source.deathSaves || {
      successes: numberOr(source.death_saves_successes, 0),
      failures: numberOr(source.death_saves_failures, 0),
    },
    concentrating_on: source.concentrating_on || source.concentration || '',
  };
}

function statusFor(combatant) {
  if (!combatant) return '';
  if (combatant.type === 'player' && combatant.deathSaves?.failures >= 3) return 'Dead';
  if (combatant.hp <= 0 && combatant.type === 'player' && combatant.deathSaves?.successes >= 3) return 'Stable';
  if (combatant.hp <= 0) return combatant.type === 'player' ? 'Dying' : 'Down';
  const pct = combatant.hp / combatant.maxHp;
  if (pct <= 0.25) return 'Critical';
  if (pct <= 0.5) return 'Bloodied';
  return '';
}

function combatantForDisplay(combatant) {
  return {
    id: combatant.id,
    name: combatant.name,
    type: combatant.type,
    hp: combatant.hp,
    current_hp: combatant.hp,
    maxHp: combatant.maxHp,
    max_hp: combatant.maxHp,
    ac: combatant.ac,
    initiative: combatant.initiative,
    conditions: safeArray(combatant.conditions),
    image_url: combatant.image_url || combatant.portrait_url || combatant.token_url || '',
    subtitle: combatant.role || combatant.occupation || (combatant.type === 'npc' ? 'NPC' : combatant.type === 'player' ? 'Player' : 'Enemy'),
  };
}

function playerBaseStates(combatants = []) {
  return combatants.reduce((result, combatant) => {
    if (combatant?.type === 'player' && combatant.character_id) {
      result[String(combatant.character_id)] = combatStateSnapshot(combatant);
    }
    return result;
  }, {});
}

export default function CombatPageTable() {
  const { campaignId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const scenario = location.state?.scenario;
  const campaignName = location.state?.campaignName || 'Campaign';
  const source = location.state?.source || 'campaign-prep';
  const combatKey = `gm.activeCombat.${campaignId}`;

  const [combatants, setCombatants] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [expandedId, setExpandedId] = useState('');
  const [hpAmounts, setHpAmounts] = useState({});
  const [hideMonsterHp, setHideMonsterHp] = useState(false);
  const [attackingId, setAttackingId] = useState('');
  const [view, setView] = useState('tracker');
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState('');
  const [mapTokens, setMapTokens] = useState([]);
  const [mapZoom, setMapZoom] = useState(1);
  const [collectedLoot, setCollectedLoot] = useState([]);
  const [initialised, setInitialised] = useState(false);
  const [combatBanner, setCombatBanner] = useState(null);
  const bannerTimerRef = useRef(null);
  const initiativeSubmissionRef = useRef({});
  const initialPlayerStatesRef = useRef({});

  useEffect(() => () => {
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
  }, []);

  useEffect(() => {
    if (!scenario) {
      toast.error('No combat encounter found');
      navigate(source === 'live-play' ? `/gm-screen/${campaignId}` : `/campaign/${campaignId}`, { replace: true });
      return;
    }

    let restored = null;
    try {
      const raw = localStorage.getItem(combatKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.scenarioId === (scenario.id || scenario.name)) restored = parsed;
      }
    } catch { /* ignore broken checkpoint */ }

    const scenarioStart = safeArray(scenario.combatants).map(initialiseCombatant);
    const scenarioBaseStates = playerBaseStates(scenarioStart);

    if (restored?.combatants?.length) {
      initialPlayerStatesRef.current = {
        ...scenarioBaseStates,
        ...(restored.initialPlayerStates || {}),
      };
      setCombatants(restored.combatants);
      setCurrentTurn(Math.max(0, Math.min(restored.currentTurn || 0, restored.combatants.length - 1)));
      setRound(Math.max(1, restored.round || 1));
      setSelectedMapId(restored.selectedMapId || '');
      setMapTokens(safeArray(restored.mapTokens));
      setExpandedId(restored.combatants[Math.max(0, Math.min(restored.currentTurn || 0, restored.combatants.length - 1))]?.id || '');
      toast.info('Combat restored', { description: `Round ${Math.max(1, restored.round || 1)} checkpoint recovered.` });
    } else {
      const loaded = scenarioStart.sort((a, b) => b.initiative - a.initiative);
      initialPlayerStatesRef.current = playerBaseStates(loaded);
      setCombatants(loaded);
      setExpandedId(loaded[0]?.id || '');
      if (loaded.length) toast.success(`${loaded.length} combatants rolled initiative`);
    }
    setInitialised(true);
  }, [campaignId, combatKey, navigate, scenario, source]);

  useEffect(() => {
    if (!campaignId) return;
    apiClient.get(`/campaigns/${campaignId}/maps`)
      .then(response => setMaps(safeArray(response.data)))
      .catch(() => setMaps([]));
  }, [campaignId]);

  useEffect(() => {
    if (!initialised || !scenario) return;
    try {
      localStorage.setItem(combatKey, JSON.stringify({
        scenarioId: scenario.id || scenario.name,
        scenarioName: scenario.name,
        combatants,
        currentTurn,
        round,
        selectedMapId,
        mapTokens,
        initialPlayerStates: initialPlayerStatesRef.current,
        savedAt: Date.now(),
      }));
    } catch { /* local checkpoint is best effort */ }
  }, [combatKey, combatants, currentTurn, initialised, mapTokens, round, scenario, selectedMapId]);

  useEffect(() => {
    if (!scenario || !maps.length || selectedMapId) return;
    const requested = scenario.map_id || scenario.mapId || '';
    if (requested && maps.some(item => item.id === requested)) setSelectedMapId(requested);
  }, [maps, scenario, selectedMapId]);

  const active = combatants[currentTurn] || null;
  const selectedMap = useMemo(() => maps.find(item => item.id === selectedMapId) || null, [maps, selectedMapId]);

  useEffect(() => {
    if (!selectedMap || mapTokens.length) return;
    const savedTokens = safeArray(selectedMap.tokens);
    setMapTokens(combatants.map((combatant, index) => {
      const saved = savedTokens.find(token => token.id === combatant.id);
      return {
        ...saved,
        id: combatant.id,
        name: combatant.name,
        x: saved?.x ?? (2 + (index % 6)),
        y: saved?.y ?? (2 + Math.floor(index / 6)),
        isEnemy: combatant.type !== 'player' && combatant.type !== 'npc',
        isAlly: combatant.type === 'player' || combatant.type === 'npc',
      };
    }));
  }, [combatants, mapTokens.length, selectedMap]);

  useEffect(() => {
    if (!initialised || !scenario || !campaignId) return undefined;
    const timer = window.setTimeout(() => {
      const players = combatants.filter(item => item.type === 'player').map(combatantForDisplay);
      const visibleCreatures = combatants.filter(item => item.type !== 'player').map(combatantForDisplay);
      const activeId = active ? (active.type === 'player' ? `player-${active.id}` : active.id) : '';
      const mapUrl = selectedMap?.map_url || selectedMap?.background_url || selectedMap?.backgroundImage || selectedMap?.background_image || '';
      publishCampaignDisplayState(campaignId, createDisplayState('combat', {
        combat_id: scenario.id || scenario.name || 'combat',
        scenario_id: scenario.id || '',
        title: scenario.name || 'Combat',
        round,
        active_id: activeId,
        party: players,
        tokens: visibleCreatures,
        map_url: mapUrl,
        banner: combatBanner || undefined,
      })).catch(() => {});
    }, 120);
    return () => window.clearTimeout(timer);
  }, [active, campaignId, combatBanner, combatants, initialised, round, scenario, selectedMap]);

  useEffect(() => {
    if (!initialised || !scenario || !campaignId) return undefined;
    let cancelled = false;

    const syncPlayerInitiative = async () => {
      try {
        const response = await apiClient.get(`/campaigns/${campaignId}/combat-initiative/submissions`);
        if (cancelled) return;
        const rows = safeArray(response.data?.submissions);
        if (!rows.length) return;

        const byCharacter = new Map(rows.filter(row => row?.character_id).map(row => [row.character_id, row]));
        const activeId = combatants[currentTurn]?.id || '';
        const announced = [];
        let changed = false;

        const updated = combatants.map(combatant => {
          if (combatant.type !== 'player') return combatant;
          const characterId = combatant.character_id || combatant.id;
          const submission = byCharacter.get(characterId);
          if (!submission) return combatant;

          const initiative = numberOr(submission.initiative, combatant.initiative);
          const signature = `${initiative}:${submission.updated_at || ''}`;
          if (initiativeSubmissionRef.current[characterId] !== signature) {
            initiativeSubmissionRef.current[characterId] = signature;
            announced.push(submission);
          }
          if (initiative === combatant.initiative && combatant.initiativeSource === 'player') return combatant;
          changed = true;
          return { ...combatant, initiative, initiativeSource: 'player' };
        });

        if (changed) {
          updated.sort((a, b) => b.initiative - a.initiative);
          setCombatants(updated);
          if (activeId) setCurrentTurn(Math.max(0, updated.findIndex(item => item.id === activeId)));
        }

        announced.forEach(submission => {
          toast.success(`${submission.character_name || 'Player'} submitted initiative ${submission.initiative}`);
        });
      } catch {
        // Initiative sharing is additive; combat remains fully usable if polling fails.
      }
    };

    syncPlayerInitiative();
    const interval = window.setInterval(syncPlayerInitiative, 2200);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [campaignId, combatants, currentTurn, initialised, scenario]);

  const focusCombatant = (id) => {
    setExpandedId(id);
    window.requestAnimationFrame(() => {
      document.getElementById(`combatant-${id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  };

  const nextTurn = () => {
    if (!combatants.length) return;
    const nextIndex = currentTurn >= combatants.length - 1 ? 0 : currentTurn + 1;
    if (nextIndex === 0) setRound(value => value + 1);
    setCurrentTurn(nextIndex);
    focusCombatant(combatants[nextIndex]?.id);
  };

  const applyHpChange = (id, change) => {
    setCombatants(previous => previous.map(combatant => {
      if (combatant.id !== id) return combatant;
      const damage = change < 0 ? Math.abs(change) : 0;
      let nextHp = combatant.hp;
      let nextTemp = combatant.tempHp || 0;

      if (damage > 0) {
        const absorbed = Math.min(nextTemp, damage);
        nextTemp -= absorbed;
        nextHp = Math.max(0, nextHp - (damage - absorbed));
        if (combatant.concentrating_on || safeArray(combatant.conditions).includes('concentrating')) {
          const dc = Math.max(10, Math.floor(damage / 2));
          toast.warning(`${combatant.name}: concentration check DC ${dc}`);
        }
      } else if (change > 0) {
        nextHp = Math.min(combatant.maxHp, nextHp + change);
      }

      const wasDown = combatant.hp <= 0;
      const nowDown = nextHp <= 0;
      if (!wasDown && nowDown) toast.warning(`${combatant.name} is down`);
      if (wasDown && !nowDown) toast.success(`${combatant.name} is back up`);

      return {
        ...combatant,
        hp: nextHp,
        tempHp: nextTemp,
        deathSaves: wasDown !== nowDown ? { successes: 0, failures: 0 } : combatant.deathSaves,
      };
    }));
  };

  const setTempHp = (id, value) => setCombatants(previous => previous.map(combatant => combatant.id === id
    ? { ...combatant, tempHp: Math.max(0, numberOr(value, 0)) }
    : combatant));

  const toggleCondition = (id, condition) => setCombatants(previous => previous.map(combatant => {
    if (combatant.id !== id) return combatant;
    const conditions = safeArray(combatant.conditions);
    return { ...combatant, conditions: conditions.includes(condition) ? conditions.filter(item => item !== condition) : [...conditions, condition] };
  }));

  const rollDeathSave = (id) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    setCombatants(previous => previous.map(combatant => {
      if (combatant.id !== id) return combatant;
      if (roll === 20) {
        toast.success(`${combatant.name}: natural 20 — back with 1 HP`);
        return { ...combatant, hp: 1, deathSaves: { successes: 0, failures: 0 } };
      }
      const saves = { ...(combatant.deathSaves || { successes: 0, failures: 0 }) };
      if (roll === 1) saves.failures = Math.min(3, saves.failures + 2);
      else if (roll >= 10) saves.successes = Math.min(3, saves.successes + 1);
      else saves.failures = Math.min(3, saves.failures + 1);
      toast[roll >= 10 ? 'success' : 'error'](`${combatant.name}: ${roll} · ${saves.successes} success / ${saves.failures} fail`);
      return { ...combatant, deathSaves: saves };
    }));
  };

  const updateInitiative = (id, value) => {
    const activeId = active?.id;
    const updated = combatants.map(combatant => combatant.id === id ? { ...combatant, initiative: numberOr(value, combatant.initiative), initiativeSource: 'gm' } : combatant)
      .sort((a, b) => b.initiative - a.initiative);
    setCombatants(updated);
    if (activeId) setCurrentTurn(Math.max(0, updated.findIndex(item => item.id === activeId)));
  };

  const rerollInitiative = id => {
    const activeId = active?.id;
    const updated = combatants.map(combatant => {
      if (id && combatant.id !== id) return combatant;
      const initiativeRoll = Math.floor(Math.random() * 20) + 1;
      return { ...combatant, initiativeRoll, initiative: initiativeRoll + numberOr(combatant.initiativeMod, 0), initiativeSource: 'rook' };
    }).sort((a, b) => b.initiative - a.initiative);
    setCombatants(updated);
    if (id && activeId) setCurrentTurn(Math.max(0, updated.findIndex(item => item.id === activeId)));
    else {
      setCurrentTurn(0);
      setExpandedId(updated[0]?.id || '');
    }
  };

  const moveInOrder = (id, direction) => {
    const activeId = active?.id;
    const index = combatants.findIndex(item => item.id === id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= combatants.length) return;
    const updated = [...combatants];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setCombatants(updated);
    if (activeId) setCurrentTurn(Math.max(0, updated.findIndex(item => item.id === activeId)));
  };

  const removeCombatant = (id) => {
    const index = combatants.findIndex(item => item.id === id);
    if (index < 0) return;
    const updated = combatants.filter(item => item.id !== id);
    setCombatants(updated);
    setCurrentTurn(turn => Math.max(0, Math.min(turn - (index < turn ? 1 : 0), Math.max(0, updated.length - 1))));
    setExpandedId(previous => previous === id ? (updated[0]?.id || '') : previous);
    setAttackingId(previous => previous === id ? '' : previous);
  };

  const addCombatant = (incoming) => {
    const prepared = initialiseCombatant(incoming, combatants.length);
    const activeId = active?.id;
    const updated = [...combatants, prepared].sort((a, b) => b.initiative - a.initiative);
    setCombatants(updated);
    if (activeId) setCurrentTurn(Math.max(0, updated.findIndex(item => item.id === activeId)));
    setExpandedId(prepared.id);
    toast.success(`${prepared.name} joined combat`);
  };

  const announceCombat = event => {
    if (!event?.text) return;
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    setCombatBanner({
      id: `combat-${Date.now()}`,
      eyebrow: 'Combat',
      text: event.text,
      subtitle: event.subtitle || '',
      tone: event.tone || 'neutral',
    });
    bannerTimerRef.current = window.setTimeout(() => setCombatBanner(null), 6500);
  };

  const collectLoot = (combatant) => {
    const items = safeArray(combatant.loot).map(item => ({ ...item, source: combatant.name }));
    if (!items.length) return;
    setCollectedLoot(previous => [...previous, ...items]);
    setCombatants(previous => previous.map(item => item.id === combatant.id ? { ...item, lootCollected: true } : item));
    toast.success(`${items.length} loot item${items.length === 1 ? '' : 's'} collected`);
  };

  const saveLoot = async (options = {}) => {
    const throwOnError = Boolean(options?.throwOnError);
    const pending = [...collectedLoot];
    let savedCount = 0;
    try {
      for (const item of pending) {
        await apiClient.post(`/campaigns/${campaignId}/inventory`, {
          name: item.name,
          quantity: item.quantity || 1,
          item_type: item.item_type || 'misc',
          value: item.value || '',
          is_magical: Boolean(item.is_magical),
          description: item.description || `Looted from ${item.source}`,
          notes: `Combat loot · Round ${round}`,
        });
        savedCount += 1;
      }
      toast.success('Loot added to party inventory');
      setCollectedLoot([]);
      return true;
    } catch (error) {
      // Keep only the unsaved remainder so retrying cannot duplicate items that
      // already reached the server before the connection failed.
      setCollectedLoot(pending.slice(savedCount));
      toast.error(savedCount > 0
        ? `${savedCount} loot item${savedCount === 1 ? '' : 's'} saved; ${pending.length - savedCount} still waiting`
        : 'Could not add loot to party inventory');
      if (throwOnError) throw error;
      return false;
    }
  };

  const syncPlayerState = async () => {
    const realCharacters = combatants.filter(item => item.type === 'player' && item.character_id);
    const legacyPlayers = combatants.filter(item => item.type === 'player' && !item.character_id && item.legacy_player_id);

    await Promise.all(realCharacters.map(async item => {
      const state = combatStateSnapshot(item);
      await apiClient.patch(`/characters/${item.character_id}`, state);
      // If another save in this batch later fails, this successfully persisted
      // character now has a newer safe baseline for an offline retry.
      initialPlayerStatesRef.current[String(item.character_id)] = state;
    }));

    await Promise.all(legacyPlayers.map(item => (
      apiClient.put(`/campaigns/${campaignId}/players/${item.legacy_player_id}`, { hp: item.hp })
    )));
  };

  const blankCombatDisplay = () => createDisplayState('blank', {
    title: 'Combat ended',
    subtitle: 'Waiting for the GM',
  });

  const endCombatOffline = async () => {
    const realCharacters = combatants.filter(item => item.type === 'player' && item.character_id);
    const legacyPlayers = combatants.filter(item => item.type === 'player' && !item.character_id && item.legacy_player_id);

    if (legacyPlayers.length) {
      toast.error('Reconnect before ending this fight: legacy roster HP cannot sync safely offline yet.');
      return false;
    }
    if (collectedLoot.length) {
      toast.error('Reconnect or save the collected loot before ending this fight. Offline loot creation is not enabled yet.');
      return false;
    }

    const missingBase = realCharacters.filter(item => !initialPlayerStatesRef.current[String(item.character_id)]);
    if (missingBase.length) {
      toast.error('This restored fight is missing its safe pre-combat baseline. Reconnect once before ending it offline.');
      return false;
    }

    const queued = await Promise.all(realCharacters.map(item => queueOfflineCombatState({
      campaignId,
      characterId: item.character_id,
      characterName: item.name,
      baseState: initialPlayerStatesRef.current[String(item.character_id)],
      state: combatStateSnapshot(item),
    })));
    if (queued.some(item => !item)) {
      toast.error('Rookie could not store the offline combat changes safely. The fight has been kept open.');
      return false;
    }

    const displayState = blankCombatDisplay();
    const closeRecord = await queueOfflineCombatClose({ campaignId, displayState });
    if (!closeRecord) {
      toast.error('Rookie could not store the reconnect cleanup safely. The fight has been kept open.');
      return false;
    }

    publishDisplayState(campaignId, displayState);
    try { localStorage.removeItem(combatKey); } catch { /* ignore */ }
    toast.success(realCharacters.length
      ? `Combat ended offline · ${realCharacters.length} player state${realCharacters.length === 1 ? '' : 's'} queued for sync`
      : 'Combat ended offline · reconnect cleanup queued');
    navigate(source === 'live-play' ? `/gm-screen/${campaignId}` : `/campaign/${campaignId}`, { replace: true });
    return true;
  };

  const endCombat = async () => {
    if (!window.confirm('End this combat? Player combat state will be saved.')) return;

    if (navigator.onLine === false) {
      await endCombatOffline();
      return;
    }

    try {
      await syncPlayerState();
      if (collectedLoot.length) await saveLoot({ throwOnError: true });

      const displayState = blankCombatDisplay();
      publishDisplayState(campaignId, displayState);
      let cleanupQueued = false;
      try {
        await Promise.all([
          apiClient.delete(`/campaigns/${campaignId}/combat-initiative/submissions`),
          apiClient.put(`/campaigns/${campaignId}/display-state`, displayState),
        ]);
      } catch {
        const queued = await queueOfflineCombatClose({ campaignId, displayState });
        cleanupQueued = Boolean(queued);
      }

      try { localStorage.removeItem(combatKey); } catch { /* ignore */ }
      toast.success(cleanupQueued
        ? 'Combat ended and player state saved · display cleanup will retry automatically'
        : 'Combat ended and player state saved');
      navigate(source === 'live-play' ? `/gm-screen/${campaignId}` : `/campaign/${campaignId}`, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not safely end combat. The fight is still open so you can retry.');
    }
  };

  const resetCheckpoint = () => {
    if (!window.confirm('Reset this fight to the encounter start and reroll initiative?')) return;
    try { localStorage.removeItem(combatKey); } catch { /* ignore */ }
    apiClient.delete(`/campaigns/${campaignId}/combat-initiative/submissions`).catch(() => null);
    initiativeSubmissionRef.current = {};
    const loaded = safeArray(scenario?.combatants).map(initialiseCombatant).sort((a, b) => b.initiative - a.initiative);
    initialPlayerStatesRef.current = playerBaseStates(loaded);
    setCombatants(loaded);
    setCurrentTurn(0);
    setRound(1);
    setExpandedId(loaded[0]?.id || '');
    setMapTokens([]);
    setCombatBanner(null);
    toast.success('Encounter reset');
  };

  if (!scenario) return null;

  return (
    <div className="combat-table-page" data-testid="combat-table-page">
      <header className="combat-table-header">
        <button type="button" onClick={endCombat} className="combat-icon-button" title="End combat"><ArrowLeft size={18} /></button>
        <div className="combat-title-wrap">
          <strong><Swords size={17} /> {scenario.name || 'Combat'}</strong>
          <span>{campaignName}</span>
        </div>
        <div className="combat-round"><span>Round</span><strong>{round}</strong></div>
        <button type="button" onClick={() => setHideMonsterHp(value => !value)} className="combat-icon-button" title="Hide or show enemy HP">{hideMonsterHp ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        <button type="button" onClick={resetCheckpoint} className="combat-icon-button" title="Reset encounter"><RotateCcw size={16} /></button>
        <button type="button" onClick={nextTurn} className="combat-next-top"><SkipForward size={16} /> Next</button>
      </header>

      <nav className="combat-view-tabs">
        <button type="button" onClick={() => setView('tracker')} data-active={view === 'tracker'}><Swords size={14} /> Tracker</button>
        <button type="button" onClick={() => setView('map')} data-active={view === 'map'}><Map size={14} /> Map</button>
      </nav>

      {view === 'tracker' ? (
        <main className="combat-tracker">
          <section className="combat-now">
            <span className="combat-eyebrow">Current turn</span>
            <strong>{active?.name || 'No combatants'}</strong>
            {active && <span>Init {active.initiative} · AC {active.ac} · HP {active.hp}/{active.maxHp}{active.tempHp ? ` +${active.tempHp} temp` : ''}</span>}
          </section>

          <details className="combat-initiative-panel">
            <summary><Dices size={14} /> Initiative Setup <span>GM · Rook · player phones</span></summary>
            <div className="combat-initiative-body">
              <div className="combat-initiative-tools">
                <span>Players can submit from their campaign page. You can also enter physical totals here or let Rook roll.</span>
                <button type="button" onClick={() => rerollInitiative(null)}><Dices size={13} /> Roll All</button>
              </div>
              <div className="combat-initiative-grid">
                {combatants.map(combatant => (
                  <div key={combatant.id} className="combat-initiative-row">
                    <span>
                      <strong>{combatant.name}</strong>
                      <small>{combatant.initiativeMod >= 0 ? '+' : ''}{combatant.initiativeMod} mod{combatant.initiativeSource === 'player' ? ' · Player submitted' : combatant.initiativeSource === 'rook' ? ' · Rook rolled' : ''}</small>
                    </span>
                    <input
                      key={`${combatant.id}-${combatant.initiative}`}
                      type="number"
                      defaultValue={combatant.initiative}
                      aria-label={`${combatant.name} initiative`}
                      onBlur={event => updateInitiative(combatant.id, event.target.value)}
                      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                    />
                    <button type="button" onClick={() => rerollInitiative(combatant.id)} title={`Roll ${combatant.name} initiative`}><Dices size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          </details>

          <div className="combat-list">
            {combatants.map((combatant, index) => (
              <CombatantCard
                key={combatant.id}
                combatant={combatant}
                targets={combatants.filter(item => item.id !== combatant.id)}
                isCurrent={index === currentTurn}
                expanded={expandedId === combatant.id}
                hideMonsterHp={hideMonsterHp}
                hpAmount={hpAmounts[combatant.id] ?? 1}
                attacking={attackingId === combatant.id}
                onToggle={() => setExpandedId(previous => previous === combatant.id ? '' : combatant.id)}
                onHpAmount={value => setHpAmounts(previous => ({ ...previous, [combatant.id]: Math.max(1, numberOr(value, 1)) }))}
                onDamage={() => applyHpChange(combatant.id, -Math.max(1, numberOr(hpAmounts[combatant.id], 1)))}
                onHeal={() => applyHpChange(combatant.id, Math.max(1, numberOr(hpAmounts[combatant.id], 1)))}
                onQuickHp={amount => applyHpChange(combatant.id, amount)}
                onTempHp={value => setTempHp(combatant.id, value)}
                onCondition={condition => toggleCondition(combatant.id, condition)}
                onDeathSave={() => rollDeathSave(combatant.id)}
                onInitiative={value => updateInitiative(combatant.id, value)}
                onMove={direction => moveInOrder(combatant.id, direction)}
                onRemove={() => removeCombatant(combatant.id)}
                onAttack={() => setAttackingId(previous => previous === combatant.id ? '' : combatant.id)}
                onApplyAttackDamage={(targetId, damage) => applyHpChange(targetId, -Math.max(0, numberOr(damage, 0)))}
                onAnnounce={announceCombat}
                onLoot={() => collectLoot(combatant)}
              />
            ))}
          </div>

          <details className="combat-add-panel">
            <summary><Plus size={14} /> Add combatant</summary>
            <div><NPCCombatRecruiter campaignId={campaignId} existingCombatantIds={combatants.map(item => item.id)} onAddNPC={addCombatant} /></div>
          </details>

          {collectedLoot.length > 0 && (
            <button type="button" onClick={saveLoot} className="combat-loot-save"><Package size={14} /> Add {collectedLoot.length} collected item{collectedLoot.length === 1 ? '' : 's'} to party loot</button>
          )}
        </main>
      ) : (
        <main className="combat-map-view">
          <div className="combat-map-toolbar">
            <select value={selectedMapId} onChange={event => { setSelectedMapId(event.target.value); setMapTokens([]); }}>
              <option value="">Choose battle map…</option>
              {maps.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button type="button" onClick={() => setMapZoom(value => Math.max(0.5, value - 0.2))}>−</button>
            <span>{Math.round(mapZoom * 100)}%</span>
            <button type="button" onClick={() => setMapZoom(value => Math.min(2, value + 0.2))}>+</button>
          </div>
          {selectedMap ? (
            <div className="combat-map-canvas">
              <MapCanvas
                mapData={selectedMap}
                onMapChange={() => {}}
                tool="select"
                selectedTerrain="stone"
                selectedWallType="stone"
                tokens={mapTokens}
                onTokenMove={(tokenId, x, y) => setMapTokens(previous => previous.map(token => token.id === tokenId ? { ...token, x, y } : token))}
                fogOfWar={null}
                onFogChange={() => {}}
                showGrid
                gridSize={40}
                zoom={mapZoom}
              />
            </div>
          ) : (
            <div className="combat-map-empty"><Map size={38} /><strong>No battle map selected</strong><span>The combat tracker remains the main table view. Choose a saved map only when you need one.</span></div>
          )}
        </main>
      )}

      <footer className="combat-bottom-bar">
        <span><strong>{active?.name || 'Combat'}</strong><small>Round {round}</small></span>
        <button type="button" onClick={nextTurn}><SkipForward size={17} /> Next Turn</button>
      </footer>

      <style>{combatCss}</style>
    </div>
  );
}

function CombatantCard({
  combatant, targets, isCurrent, expanded, hideMonsterHp, hpAmount, attacking,
  onToggle, onHpAmount, onDamage, onHeal, onQuickHp, onTempHp, onCondition,
  onDeathSave, onInitiative, onMove, onRemove, onAttack, onApplyAttackDamage, onAnnounce, onLoot,
}) {
  const pct = Math.max(0, Math.min(100, (combatant.hp / combatant.maxHp) * 100));
  const status = statusFor(combatant);
  const isEnemy = combatant.type !== 'player' && combatant.type !== 'npc';
  const activeConditions = safeArray(combatant.conditions);
  const hpLabel = hideMonsterHp && isEnemy
    ? (pct > 75 ? 'Healthy' : pct > 50 ? 'Wounded' : pct > 25 ? 'Bloodied' : pct > 0 ? 'Critical' : 'Down')
    : `${combatant.hp}/${combatant.maxHp}`;

  return (
    <article id={`combatant-${combatant.id}`} className="combat-card" data-current={isCurrent} data-expanded={expanded}>
      <button type="button" onClick={onToggle} className="combat-card-head">
        <span className="combat-init">{combatant.initiative}</span>
        <span className="combat-card-name">
          <strong>{combatant.name}</strong>
          <small>{combatant.type === 'player' ? 'Player' : combatant.type === 'npc' ? 'NPC' : 'Enemy'}{status ? ` · ${status}` : ''}</small>
        </span>
        <span className="combat-mini-stat"><Shield size={12} /> {combatant.ac}</span>
        <span className="combat-mini-hp"><Heart size={12} /> {hpLabel}{combatant.tempHp ? ` +${combatant.tempHp}` : ''}</span>
        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      <div className="combat-hp-track"><span style={{ width: `${pct}%` }} /></div>

      {activeConditions.length > 0 && (
        <div className="combat-active-conditions">{activeConditions.map(condition => <span key={condition}>{CONDITIONS.find(item => item[0] === condition)?.[1] || condition}</span>)}</div>
      )}

      {expanded && (
        <div className="combat-card-body">
          <section className="combat-hp-controls">
            <div className="combat-amount-row">
              <label>Amount<input type="number" min="1" value={hpAmount} onChange={event => onHpAmount(event.target.value)} /></label>
              <button type="button" onClick={onDamage} className="damage">Damage</button>
              <button type="button" onClick={onHeal} className="heal">Heal</button>
            </div>
            <div className="combat-quick-hp">
              <button type="button" onClick={() => onQuickHp(-1)}>−1</button>
              <button type="button" onClick={() => onQuickHp(-5)}>−5</button>
              <button type="button" onClick={() => onQuickHp(1)}>+1</button>
              <button type="button" onClick={() => onQuickHp(5)}>+5</button>
              <label>Temp <input type="number" min="0" value={combatant.tempHp || 0} onChange={event => onTempHp(event.target.value)} /></label>
            </div>
          </section>

          {combatant.type === 'player' && combatant.hp <= 0 && combatant.deathSaves?.failures < 3 && (
            <section className="combat-death-saves">
              <span><Skull size={14} /> Death Saves</span>
              <strong className="successes">✓ {combatant.deathSaves?.successes || 0}/3</strong>
              <strong className="failures">✕ {combatant.deathSaves?.failures || 0}/3</strong>
              <button type="button" onClick={onDeathSave} disabled={(combatant.deathSaves?.successes || 0) >= 3}><Play size={13} /> Roll</button>
            </section>
          )}

          <section className="combat-condition-section">
            <span className="combat-section-label">Conditions</span>
            <div className="combat-condition-grid">
              {CONDITIONS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => onCondition(id)} data-active={activeConditions.includes(id)}>{activeConditions.includes(id) && <Check size={11} />}{label}</button>
              ))}
            </div>
          </section>

          {isEnemy && combatant.hp > 0 && (
            <section className="combat-attack-section">
              {!attacking && <button type="button" onClick={onAttack} className="combat-attack-button"><Swords size={14} /> Attack a Target</button>}
              {attacking && (
                <TargetedAttackPanel
                  attacker={combatant}
                  targets={targets}
                  onClose={onAttack}
                  onApplyDamage={onApplyAttackDamage}
                  onAnnounce={onAnnounce}
                />
              )}
            </section>
          )}

          {isEnemy && combatant.hp <= 0 && safeArray(combatant.loot).length > 0 && !combatant.lootCollected && (
            <button type="button" onClick={onLoot} className="combat-collect-loot"><Package size={13} /> Collect Loot ({combatant.loot.length})</button>
          )}

          <section className="combat-order-tools">
            <label>Initiative<input type="number" value={combatant.initiative} onChange={event => onInitiative(event.target.value)} /></label>
            <button type="button" onClick={() => onMove('up')}><ChevronUp size={14} /> Up</button>
            <button type="button" onClick={() => onMove('down')}><ChevronDown size={14} /> Down</button>
            <button type="button" onClick={onRemove} className="remove"><Trash2 size={14} /> Remove</button>
          </section>
        </div>
      )}
    </article>
  );
}

const combatCss = `
  .combat-table-page { min-height: 100vh; background: ${rq.bg}; color: ${rq.text}; padding-bottom: 78px; }
  .combat-table-header { position: sticky; top: 0; z-index: 30; min-height: 58px; padding: 7px 10px; display: grid; grid-template-columns: 38px minmax(0,1fr) auto 38px 38px auto; gap: 6px; align-items: center; background: rgba(36,36,36,.97); border-bottom: 1px solid ${rq.line}; backdrop-filter: blur(12px); }
  .combat-icon-button { width: 38px; height: 38px; border: 1px solid ${rq.line}; background: ${rq.panel}; color: ${rq.text}; display: grid; place-items: center; cursor: pointer; }
  .combat-title-wrap { min-width: 0; display: grid; gap: 1px; }
  .combat-title-wrap strong { display: flex; align-items: center; gap: 6px; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .combat-title-wrap span { color: ${rq.muted}; font-size: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .combat-round { min-width: 54px; height: 38px; border: 1px solid ${rq.red}; background: rgba(208,0,0,.12); display: grid; place-items: center; align-content: center; line-height: 1; }
  .combat-round span { color: ${rq.muted}; text-transform: uppercase; font-size: 7px; letter-spacing: .08em; }
  .combat-round strong { font-size: 16px; }
  .combat-next-top { min-height: 38px; border: 0; background: ${rq.red}; color: #fff; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-weight: 950; cursor: pointer; }
  .combat-view-tabs { max-width: 920px; margin: 8px auto 0; padding: 0 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 1px; }
  .combat-view-tabs button { min-height: 38px; border: 1px solid ${rq.line}; background: ${rq.panel}; color: ${rq.muted}; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 900; cursor: pointer; }
  .combat-view-tabs button[data-active="true"] { background: ${rq.card}; color: ${rq.text}; border-color: ${rq.red}; }
  .combat-tracker, .combat-map-view { max-width: 920px; margin: 0 auto; padding: 8px; display: grid; gap: 7px; }
  .combat-now { display: grid; gap: 2px; padding: 10px; background: ${rq.panel}; border: 1px solid ${rq.line}; border-left: 5px solid ${rq.green}; }
  .combat-now .combat-eyebrow, .combat-section-label { color: ${rq.muted}; font-size: 8px; font-weight: 950; text-transform: uppercase; letter-spacing: .09em; }
  .combat-now strong { font-size: 18px; }
  .combat-now > span:last-child { color: ${rq.soft}; font-size: 11px; }
  .combat-initiative-panel, .combat-add-panel { background: ${rq.panel}; border: 1px solid ${rq.line}; }
  .combat-initiative-panel summary, .combat-add-panel summary { min-height: 38px; padding: 0 9px; display: flex; align-items: center; gap: 5px; cursor: pointer; color: ${rq.soft}; font-size: 10px; font-weight: 900; list-style: none; }
  .combat-initiative-panel summary span { margin-left: auto; color: ${rq.muted}; font-size: 8px; font-weight: 700; }
  .combat-initiative-body, .combat-add-panel > div { padding: 7px; border-top: 1px solid ${rq.line}; display: grid; gap: 6px; }
  .combat-initiative-tools { display: flex; justify-content: space-between; align-items: center; gap: 7px; flex-wrap: wrap; }
  .combat-initiative-tools span { color: ${rq.muted}; font-size: 9px; }
  .combat-initiative-tools button { min-height: 30px; border: 1px solid ${rq.red}; background: rgba(208,0,0,.12); color: ${rq.text}; padding: 0 8px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-size: 9px; font-weight: 900; }
  .combat-initiative-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(210px,1fr)); gap: 4px; }
  .combat-initiative-row { min-height: 38px; display: grid; grid-template-columns: minmax(0,1fr) 58px 32px; gap: 4px; align-items: center; background: ${rq.bg}; border: 1px solid ${rq.line}; padding: 4px; }
  .combat-initiative-row > span { min-width: 0; display: grid; gap: 1px; }
  .combat-initiative-row strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
  .combat-initiative-row small { color: ${rq.muted}; font-size: 8px; }
  .combat-initiative-row input { width: 100%; min-width: 0; min-height: 30px; box-sizing: border-box; background: ${rq.panel}; border: 1px solid ${rq.line}; color: ${rq.text}; text-align: center; }
  .combat-initiative-row button { width: 30px; height: 30px; border: 1px solid ${rq.line}; background: ${rq.card}; color: ${rq.soft}; display: grid; place-items: center; cursor: pointer; }
  .combat-list { display: grid; gap: 5px; }
  .combat-card { background: ${rq.panel}; border: 1px solid ${rq.line}; overflow: hidden; }
  .combat-card[data-current="true"] { border-color: ${rq.green}; box-shadow: inset 4px 0 ${rq.green}; }
  .combat-card-head { width: 100%; min-height: 52px; border: 0; background: transparent; color: ${rq.text}; padding: 6px 8px; display: grid; grid-template-columns: 38px minmax(0,1fr) auto auto 20px; gap: 6px; align-items: center; cursor: pointer; text-align: left; }
  .combat-init { width: 34px; height: 34px; display: grid; place-items: center; background: ${rq.card}; border: 1px solid ${rq.line}; font-weight: 950; font-size: 14px; }
  .combat-card[data-current="true"] .combat-init { background: ${rq.green}; color: #07140c; border-color: ${rq.green}; }
  .combat-card-name { min-width: 0; display: grid; gap: 1px; }
  .combat-card-name strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  .combat-card-name small { color: ${rq.muted}; font-size: 9px; }
  .combat-mini-stat, .combat-mini-hp { min-height: 28px; padding: 0 6px; display: inline-flex; align-items: center; gap: 4px; background: ${rq.bg}; border: 1px solid ${rq.line}; font-size: 10px; font-weight: 850; white-space: nowrap; }
  .combat-hp-track { height: 3px; background: #171717; }
  .combat-hp-track span { display: block; height: 100%; background: ${rq.green}; }
  .combat-active-conditions { padding: 4px 7px 6px; display: flex; flex-wrap: wrap; gap: 3px; }
  .combat-active-conditions span { padding: 2px 5px; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.4); color: #fbbf24; font-size: 8px; font-weight: 900; }
  .combat-card-body { border-top: 1px solid ${rq.line}; padding: 7px; display: grid; gap: 7px; background: ${rq.bg}; }
  .combat-hp-controls, .combat-condition-section, .combat-attack-section { display: grid; gap: 5px; }
  .combat-amount-row { display: grid; grid-template-columns: minmax(90px,.7fr) 1fr 1fr; gap: 5px; }
  .combat-amount-row label, .combat-quick-hp label, .combat-order-tools label { display: grid; gap: 2px; color: ${rq.muted}; font-size: 8px; font-weight: 900; text-transform: uppercase; }
  .combat-amount-row input, .combat-quick-hp input, .combat-order-tools input { width: 100%; min-width: 0; min-height: 34px; box-sizing: border-box; background: ${rq.panel}; border: 1px solid ${rq.line}; color: ${rq.text}; padding: 0 7px; }
  .combat-amount-row button { min-height: 34px; border: 0; color: #fff; font-weight: 950; cursor: pointer; }
  .combat-amount-row .damage { background: ${rq.danger}; }
  .combat-amount-row .heal { background: #15803d; }
  .combat-quick-hp { display: grid; grid-template-columns: repeat(4, minmax(42px,.45fr)) minmax(78px,1fr); gap: 4px; }
  .combat-quick-hp button { min-height: 32px; border: 1px solid ${rq.line}; background: ${rq.panel}; color: ${rq.text}; font-weight: 900; cursor: pointer; }
  .combat-condition-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(72px,1fr)); gap: 3px; }
  .combat-condition-grid button { min-height: 31px; border: 1px solid ${rq.line}; background: ${rq.panel}; color: ${rq.muted}; font-size: 9px; font-weight: 850; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 3px; }
  .combat-condition-grid button[data-active="true"] { background: rgba(245,158,11,.12); color: #fbbf24; border-color: #f59e0b; }
  .combat-death-saves { min-height: 40px; display: grid; grid-template-columns: minmax(0,1fr) auto auto auto; gap: 6px; align-items: center; padding: 6px; border: 1px solid rgba(239,68,68,.45); background: rgba(239,68,68,.08); }
  .combat-death-saves > span { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 900; }
  .combat-death-saves strong { font-size: 10px; }
  .combat-death-saves .successes { color: ${rq.green}; } .combat-death-saves .failures { color: ${rq.danger}; }
  .combat-death-saves button, .combat-attack-button, .combat-collect-loot, .combat-loot-save { min-height: 32px; border: 1px solid ${rq.line}; background: ${rq.card}; color: ${rq.text}; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; font-size: 10px; font-weight: 900; }
  .combat-attack-button { border-color: ${rq.red}; background: rgba(208,0,0,.14); }
  .combat-collect-loot, .combat-loot-save { border-color: #ca8a04; background: rgba(202,138,4,.14); color: #fde68a; }
  .combat-order-tools { display: grid; grid-template-columns: minmax(80px,1fr) auto auto auto; gap: 4px; align-items: end; }
  .combat-order-tools button { min-height: 34px; border: 1px solid ${rq.line}; background: ${rq.panel}; color: ${rq.soft}; padding: 0 7px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-size: 9px; font-weight: 900; }
  .combat-order-tools .remove { color: #fca5a5; }
  .combat-map-toolbar { display: grid; grid-template-columns: minmax(0,1fr) 34px auto 34px; gap: 4px; align-items: center; }
  .combat-map-toolbar select { min-height: 36px; min-width: 0; background: ${rq.panel}; border: 1px solid ${rq.line}; color: ${rq.text}; padding: 0 7px; }
  .combat-map-toolbar button { height: 36px; border: 1px solid ${rq.line}; background: ${rq.panel}; color: ${rq.text}; cursor: pointer; }
  .combat-map-toolbar span { color: ${rq.muted}; font-size: 10px; text-align: center; }
  .combat-map-canvas { height: min(68vh,700px); min-height: 420px; border: 1px solid ${rq.line}; background: #141414; overflow: hidden; }
  .combat-map-empty { min-height: 360px; display: grid; place-items: center; align-content: center; gap: 7px; border: 1px dashed ${rq.line}; color: ${rq.muted}; text-align: center; padding: 20px; }
  .combat-map-empty strong { color: ${rq.text}; }
  .combat-map-empty span { max-width: 430px; font-size: 11px; line-height: 1.4; }
  .combat-bottom-bar { position: fixed; z-index: 40; bottom: 0; left: 0; right: 0; min-height: 62px; padding: 7px max(10px,calc((100vw - 920px)/2 + 8px)); background: rgba(47,47,47,.97); border-top: 1px solid ${rq.line}; display: flex; justify-content: space-between; align-items: center; gap: 8px; backdrop-filter: blur(12px); }
  .combat-bottom-bar > span { min-width: 0; display: grid; gap: 1px; }
  .combat-bottom-bar strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  .combat-bottom-bar small { color: ${rq.muted}; font-size: 9px; }
  .combat-bottom-bar button { min-height: 42px; border: 0; background: ${rq.red}; color: #fff; padding: 0 16px; display: inline-flex; align-items: center; gap: 6px; font-weight: 950; cursor: pointer; }
  @media (max-width: 680px) {
    .combat-table-header { grid-template-columns: 36px minmax(0,1fr) 48px 36px; }
    .combat-table-header .combat-round { grid-column: 3; grid-row: 1; min-width: 48px; }
    .combat-table-header > .combat-icon-button:nth-of-type(2) { grid-column: 4; }
    .combat-table-header > .combat-icon-button:nth-of-type(3), .combat-next-top { display: none; }
    .combat-card-head { grid-template-columns: 34px minmax(0,1fr) auto auto 18px; gap: 4px; padding: 5px; }
    .combat-mini-stat { display: none; }
    .combat-mini-hp { font-size: 9px; padding: 0 5px; }
    .combat-amount-row { grid-template-columns: minmax(74px,.75fr) 1fr 1fr; }
    .combat-quick-hp { grid-template-columns: repeat(4,1fr); }
    .combat-quick-hp label { grid-column: 1 / -1; }
    .combat-order-tools { grid-template-columns: 1fr 1fr 1fr; }
    .combat-order-tools label { grid-column: 1 / -1; }
    .combat-death-saves { grid-template-columns: 1fr auto auto; }
    .combat-death-saves button { grid-column: 1 / -1; }
    .combat-map-canvas { min-height: 340px; height: 60vh; }
    .combat-initiative-grid { grid-template-columns: 1fr; }
  }
`;
