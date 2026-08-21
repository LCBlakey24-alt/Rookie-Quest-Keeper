import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Skull, Swords } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import CombatTab from '@/components/gm/CombatTab';
import MonstersTab from '@/components/gm/MonstersTab';

const theme = {
  bg: { primary: '#242424', surface: '#2f2f2f', elevated: '#3a3a3a', panel: '#2f2f2f', card: '#3a3a3a', hover: '#444444' },
  accent: { primary: '#d00000', secondary: '#d00000', gold: '#d00000', orange: '#ff3b3b', hover: '#ff3b3b', subtle: 'rgba(208,0,0,0.18)', glow: 'none', gm: '#d00000', gmSubtle: 'rgba(208,0,0,0.18)' },
  text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', white: '#ffffff' },
  border: 'rgba(255,255,255,0.16)',
  gradient: '#d00000',
};

function dexMod(stats = {}) {
  return Math.floor(((Number(stats.dexterity) || 10) - 10) / 2);
}

function playerToCombatant(player) {
  const maxHp = Number(player.max_hp ?? player.maxHitPoints ?? player.max_hit_points ?? player.hp) || 10;
  return {
    id: player.id || `player-${player.name || player.character_name}`,
    character_id: player.character_id || null,
    legacy_player_id: player.legacy_player_id || null,
    name: player.name || player.character_name || 'Player Character',
    type: 'player',
    hp: Number(player.hp ?? player.current_hp ?? player.current_hit_points) || maxHp,
    maxHp,
    ac: Number(player.ac ?? player.armor_class) || 10,
    initiativeMod: Number(player.initiativeMod ?? dexMod(player.stats || player)) || 0,
    conditions: Array.isArray(player.conditions) ? player.conditions : [],
    source: player.source || 'legacy',
    tokenColor: '#4a7dff',
    tokenSize: 40,
  };
}

function uniqueScenarioList(prev, encounter) {
  if (!encounter?.id) return prev;
  return prev.some(item => item.id === encounter.id)
    ? prev.map(item => item.id === encounter.id ? encounter : item)
    : [encounter, ...prev];
}

async function loadPartyWithLegacyFallback(campaignId) {
  try {
    return await apiClient.get(`/campaigns/${campaignId}/live-party`);
  } catch (liveError) {
    try {
      return await apiClient.get(`/campaigns/${campaignId}/players`);
    } catch {
      throw liveError;
    }
  }
}

function formatFailures(failures = []) {
  if (!failures.length) return '';
  if (failures.length === 1) return failures[0];
  return `${failures.slice(0, -1).join(', ')} and ${failures[failures.length - 1]}`;
}

export default function CombatConsolidatedTab({ campaignId }) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [campaignName, setCampaignName] = useState('Campaign');
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('combat');
  const [loadWarning, setLoadWarning] = useState('');
  const [partyReadFailed, setPartyReadFailed] = useState(false);
  const [scenarioReadFailed, setScenarioReadFailed] = useState(false);

  const loadCombatPrep = useCallback(async ({ silent = true } = {}) => {
    if (!campaignId) return { ok: false, failures: ['campaign'] };
    setLoading(true);
    try {
      const [campaignResult, playersResult, scenariosResult] = await Promise.allSettled([
        apiClient.get(`/campaigns/${campaignId}`),
        loadPartyWithLegacyFallback(campaignId),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`),
      ]);

      const failures = [];
      if (campaignResult.status === 'fulfilled') {
        setCampaignName(campaignResult.value?.data?.name || 'Campaign');
      } else {
        failures.push('campaign details');
      }

      if (playersResult.status === 'fulfilled') {
        setPlayers(Array.isArray(playersResult.value?.data) ? playersResult.value.data : []);
        setPartyReadFailed(false);
      } else {
        failures.push('party');
        setPartyReadFailed(true);
      }

      if (scenariosResult.status === 'fulfilled') {
        const loadedScenarios = Array.isArray(scenariosResult.value?.data) ? scenariosResult.value.data : [];
        setScenarios(loadedScenarios);
        setScenarioReadFailed(false);

        let requestedScenarioId = '';
        try {
          requestedScenarioId = localStorage.getItem(`gm.questEncounter.${campaignId}`) || '';
        } catch { /* handoff storage is optional */ }

        setSelectedScenario(prev => {
          let next = null;
          if (requestedScenarioId) {
            next = loadedScenarios.find(item => item.id === requestedScenarioId) || null;
          }
          if (!next && prev && loadedScenarios.some(item => item.id === prev.id)) {
            next = loadedScenarios.find(item => item.id === prev.id) || null;
          }
          if (!next) next = loadedScenarios[0] || null;
          return next;
        });

        if (requestedScenarioId) {
          try { localStorage.removeItem(`gm.questEncounter.${campaignId}`); } catch { /* ignore cleanup failure */ }
        }
      } else {
        failures.push('saved encounters');
        setScenarioReadFailed(true);
      }

      const warning = failures.length
        ? `Could not refresh ${formatFailures(failures)}. Rookie is keeping the last known data for anything that failed.`
        : '';
      setLoadWarning(warning);

      if (!silent) {
        if (failures.length) toast.warning('Encounter prep only partly refreshed', { description: warning });
        else toast.success('Encounter prep refreshed');
      }
      return { ok: failures.length === 0, failures };
    } catch (error) {
      const message = error?.response?.data?.detail || 'Could not load encounters';
      setLoadWarning(message);
      if (!silent) toast.error(message);
      return { ok: false, failures: ['encounter prep'] };
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { loadCombatPrep({ silent: true }); }, [loadCombatPrep]);

  const quickScenario = useMemo(() => ({
    id: `quick-party-${campaignId}`,
    name: 'Quick Party Combat',
    combatants: players.map(playerToCombatant),
    show_grid: true,
    grid_size: 40,
  }), [campaignId, players]);

  const launchCombat = scenario => {
    if (!scenario) return;
    const combatants = Array.isArray(scenario.combatants)
      ? scenario.combatants.map(combatant => combatant.type === 'player'
        ? playerToCombatant(players.find(player => player.id === combatant.id) || combatant)
        : combatant)
      : [];
    navigate(`/combat/${campaignId}`, { state: { scenario: { ...scenario, combatants }, campaignId, campaignName } });
  };

  const quickStartCombat = () => {
    if (partyReadFailed) {
      toast.error('Rookie could not confirm the party. Refresh before starting quick party combat.');
      return;
    }
    if (!players.length) {
      toast.error('Add or link players before starting party combat');
      return;
    }
    launchCombat(quickScenario);
  };

  const handleMonsterEncounter = encounter => {
    if (encounter?.id) {
      setScenarios(prev => uniqueScenarioList(prev, encounter));
      setSelectedScenario(encounter);
      setScenarioReadFailed(false);
    }
    setActiveMode('combat');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  if (loading && !scenarios.length && !players.length) return <section style={loadingStyle}>Loading encounters…</section>;

  return (
    <section data-testid="combat-consolidated-tab" style={shellStyle}>
      <div style={topBarStyle}>
        <nav style={modeNavStyle} aria-label="Encounter tools">
          <button type="button" onClick={() => setActiveMode('combat')} style={modeButtonStyle(activeMode === 'combat')}><Swords size={15} /> Encounters</button>
          <button type="button" onClick={() => setActiveMode('monsters')} style={modeButtonStyle(activeMode === 'monsters')}><Skull size={15} /> Monster Builder</button>
        </nav>
        <button type="button" onClick={() => loadCombatPrep({ silent: false })} disabled={loading} style={refreshButtonStyle}><RefreshCw size={14} /> {loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {loadWarning && (
        <section data-testid="combat-prep-load-warning" role="status" style={warningStyle}><AlertTriangle size={15} /> {loadWarning}</section>
      )}

      {!players.length && !partyReadFailed && activeMode === 'combat' && (
        <section style={warningStyle}><AlertTriangle size={15} /> No linked player characters yet. You can still prep encounters.</section>
      )}

      {scenarioReadFailed && !scenarios.length && activeMode === 'combat' && (
        <section style={warningStyle}><AlertTriangle size={15} /> Saved encounters could not be loaded. Refresh before assuming this campaign has no encounter prep.</section>
      )}

      {activeMode === 'monsters' ? (
        <MonstersTab campaignId={campaignId} onOpenCombat={handleMonsterEncounter} />
      ) : (
        <CombatTab
          theme={theme}
          campaignId={campaignId}
          scenarios={scenarios}
          selectedScenario={selectedScenario}
          setSelectedScenario={setSelectedScenario}
          launchCombat={launchCombat}
          quickStartCombat={quickStartCombat}
          players={players}
        />
      )}
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 8, minHeight: '100%', color: '#fff' };
const loadingStyle = { padding: 18, background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.74)' };
const topBarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const modeNavStyle = { display: 'flex', gap: 1, overflowX: 'auto', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.16)' };
const modeButtonStyle = active => ({ minHeight: 42, border: 0, background: active ? '#d00000' : '#3a3a3a', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 11px', fontWeight: 950, cursor: 'pointer', whiteSpace: 'nowrap' });
const refreshButtonStyle = { minHeight: 40, border: '1px solid rgba(255,255,255,0.16)', background: '#3a3a3a', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 9px', fontWeight: 850, cursor: 'pointer' };
const warningStyle = { display: 'flex', gap: 7, alignItems: 'center', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', borderLeft: '4px solid #d00000', padding: 8, color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 800 };
