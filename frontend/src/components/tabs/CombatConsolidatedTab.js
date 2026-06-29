import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Skull, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import CombatTab from '@/components/gm/CombatTab';
import MonstersTab from '@/components/gm/MonstersTab';

const theme = {
  bg: {
    primary: '#242424',
    surface: '#2f2f2f',
    elevated: '#3a3a3a',
    panel: '#2f2f2f',
    card: '#3a3a3a',
    hover: '#444444',
  },
  accent: {
    primary: '#d00000',
    secondary: '#d00000',
    gold: '#d00000',
    orange: '#ff3b3b',
    hover: '#ff3b3b',
    subtle: 'rgba(208,0,0,0.18)',
    glow: 'none',
    gm: '#d00000',
    gmSubtle: 'rgba(208,0,0,0.18)',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255,255,255,0.74)',
    muted: 'rgba(255,255,255,0.58)',
    white: '#ffffff',
  },
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
    name: player.name || player.character_name || 'Player Character',
    type: 'player',
    hp: Number(player.hp ?? player.current_hp ?? player.current_hit_points) || maxHp,
    maxHp,
    ac: Number(player.ac ?? player.armor_class) || 10,
    initiativeMod: Number(player.initiativeMod ?? dexMod(player.stats || player)) || 0,
    conditions: [],
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

export default function CombatConsolidatedTab({ campaignId }) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [campaignName, setCampaignName] = useState('Campaign');
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('combat');

  const loadCombatPrep = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [campaignRes, playersRes, scenariosRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}`).catch(() => ({ data: null })),
        apiClient.get(`/campaigns/${campaignId}/players`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
      ]);
      setCampaignName(campaignRes.data?.name || 'Campaign');
      setPlayers(Array.isArray(playersRes.data) ? playersRes.data : []);
      const loadedScenarios = Array.isArray(scenariosRes.data) ? scenariosRes.data : [];
      setScenarios(loadedScenarios);
      setSelectedScenario(prev => prev && loadedScenarios.some(item => item.id === prev.id) ? loadedScenarios.find(item => item.id === prev.id) : loadedScenarios[0] || null);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load Combat Control');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { loadCombatPrep(); }, [loadCombatPrep]);

  const quickScenario = useMemo(() => ({
    id: `quick-party-${campaignId}`,
    name: 'Quick Party Combat',
    combatants: players.map(playerToCombatant),
    show_grid: true,
    grid_size: 40,
  }), [campaignId, players]);

  const launchCombat = (scenario) => {
    if (!scenario) return;
    navigate('/combat', { state: { scenario, campaignId, campaignName } });
  };

  const quickStartCombat = () => {
    if (!players.length) {
      toast.error('Add players before starting party combat');
      return;
    }
    launchCombat(quickScenario);
  };

  const handleMonsterEncounter = (encounter) => {
    if (encounter?.id) {
      setScenarios(prev => uniqueScenarioList(prev, encounter));
      setSelectedScenario(encounter);
    }
    setActiveMode('combat');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  if (loading) {
    return <section style={loadingStyle}>Loading Combat Control…</section>;
  }

  return (
    <section data-testid="combat-consolidated-tab" style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Encounters</p>
          <h2 style={titleStyle}><Swords size={28} /> Combat Control</h2>
          <p style={subtitleStyle}>Prep encounters, build monster groups, add the current party, check launch readiness, and drop post-fight loot.</p>
        </div>
        <Button onClick={loadCombatPrep} style={secondaryButtonStyle}><RefreshCw size={15} /> Refresh</Button>
      </header>

      <nav style={modeNavStyle} aria-label="Encounter workspace mode">
        <button type="button" onClick={() => setActiveMode('combat')} data-active={activeMode === 'combat'} style={modeButtonStyle(activeMode === 'combat')}><Swords size={16} /> Combat Setup</button>
        <button type="button" onClick={() => setActiveMode('monsters')} data-active={activeMode === 'monsters'} style={modeButtonStyle(activeMode === 'monsters')}><Skull size={16} /> Monster Builder</button>
      </nav>

      {!players.length && activeMode === 'combat' && (
        <section style={warningStyle}>
          <AlertTriangle size={17} /> No players are linked yet. You can still prep enemy encounters, but ordinary table combat works best once players have joined or been added.
        </section>
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

const shellStyle = { display: 'grid', gap: 12, minHeight: '100%', color: '#ffffff' };
const loadingStyle = { padding: 24, background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.74)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', background: '#3a3a3a', border: '1px solid rgba(255,255,255,0.16)', padding: 14 };
const eyebrowStyle = { margin: '0 0 5px', color: '#d00000', fontSize: 11, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, display: 'flex', alignItems: 'center', gap: 9, color: '#ffffff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 950, lineHeight: 0.95 };
const subtitleStyle = { margin: '8px 0 0', color: 'rgba(255,255,255,0.74)', lineHeight: 1.45, maxWidth: 820 };
const secondaryButtonStyle = { minHeight: 38, border: 0, borderRadius: 0, background: '#2f2f2f', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 900 };
const warningStyle = { display: 'flex', gap: 8, alignItems: 'center', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', borderLeft: '6px solid #d00000', padding: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 850 };
const modeNavStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', padding: 8 };
const modeButtonStyle = (active) => ({ minHeight: 38, border: 0, background: active ? '#d00000' : '#3a3a3a', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 12px', fontWeight: 950, cursor: 'pointer' });
