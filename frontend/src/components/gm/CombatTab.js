import React, { useEffect, useMemo, useState } from 'react';
import { Swords, Users, Coins, Play, ArrowRight, Zap, Skull, UserCircle, Search, X, Save, UserCheck, Eraser, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import InitiativeTracker from './InitiativeTracker';
import apiClient from '@/lib/apiClient';

const toNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const dexMod = (stats = {}) => Math.floor(((toNumber(stats.dexterity, 10)) - 10) / 2);

function playerToCombatant(player) {
  const maxHp = toNumber(player.max_hp ?? player.maxHitPoints ?? player.max_hit_points ?? player.hp, 10);
  return {
    id: player.id || `player-${player.name}`,
    name: player.name || player.character_name || 'Player Character',
    type: 'player',
    hp: toNumber(player.hp ?? player.current_hp ?? player.current_hit_points, maxHp),
    maxHp,
    ac: toNumber(player.ac ?? player.armor_class, 10),
    initiativeMod: toNumber(player.initiativeMod, dexMod(player.stats || player)),
    conditions: [],
    tokenColor: '#4a7dff',
    tokenSize: 40,
  };
}

function npcToCombatant(npc, index = 0) {
  const maxHp = toNumber(npc.hp ?? npc.max_hp ?? npc.hit_points, 10);
  return {
    id: npc.id || `npc-${index}-${npc.name}`,
    name: npc.name || 'NPC',
    type: 'npc',
    hp: maxHp,
    maxHp,
    ac: toNumber(npc.ac ?? npc.armor_class, 10),
    initiativeMod: toNumber(npc.initiativeMod, dexMod(npc.stats || npc.abilities || npc)),
    conditions: [],
    description: npc.description || npc.notes || '',
    actions: npc.actions || [],
    reactions: npc.reactions || [],
    bonus_actions: npc.bonus_actions || [],
    tokenColor: '#EF4444',
    tokenSize: 40,
  };
}

function playtestCreatureToCreature(record, index = 0) {
  const data = record?.data || {};
  const stats = data.stats || data.abilities || {};
  return {
    ...data,
    id: `playtest-${record.id || data.id || data.name || index}`,
    name: data.name || record.name || 'Imported Creature',
    ac: data.ac ?? data.armor_class,
    armor_class: data.armor_class ?? data.ac,
    hp: data.hp ?? data.hit_points ?? data.max_hp ?? data.maxHitPoints,
    hit_points: data.hit_points ?? data.hp ?? data.max_hp ?? data.maxHitPoints,
    abilities: data.abilities || stats,
    stats,
    actions: data.actions || data.attacks || [],
    description: data.description || data.notes || '',
    source: data.source || record.source_type || 'Private playtest pack',
    sourceLabel: `Private ${record.edition || ''} playtest`,
    is_playtest_import: true,
  };
}

function combatReadinessWarnings(combatants = []) {
  const warnings = [];
  if (combatants.length === 0) {
    warnings.push('No combatants selected.');
    return warnings;
  }
  if (!combatants.some(combatant => combatant.type === 'player')) warnings.push('No player characters selected.');
  if (!combatants.some(combatant => combatant.type !== 'player')) warnings.push('No enemies selected.');

  const missingHp = combatants.filter(combatant => !Number.isFinite(Number(combatant.hp ?? combatant.maxHp))).map(combatant => combatant.name);
  if (missingHp.length) warnings.push(`Missing HP for ${missingHp.slice(0, 3).join(', ')}${missingHp.length > 3 ? '…' : ''}.`);

  const missingAc = combatants.filter(combatant => !Number.isFinite(Number(combatant.ac))).map(combatant => combatant.name);
  if (missingAc.length) warnings.push(`Missing AC for ${missingAc.slice(0, 3).join(', ')}${missingAc.length > 3 ? '…' : ''}.`);

  const enemiesWithoutActions = combatants
    .filter(combatant => combatant.type !== 'player' && !combatant.actions?.length && !combatant.description)
    .map(combatant => combatant.name);
  if (enemiesWithoutActions.length) warnings.push(`No actions/description for ${enemiesWithoutActions.slice(0, 3).join(', ')}${enemiesWithoutActions.length > 3 ? '…' : ''}.`);

  return warnings;
}

function creatureToCombatant(creature, index = 0) {
  const maxHp = toNumber(creature.hp ?? creature.maxHp ?? creature.hit_points, 10);
  return {
    id: `${creature.id || creature.name || 'creature'}-${index}-${Date.now()}`,
    name: creature.name || 'Creature',
    type: 'monster',
    hp: maxHp,
    maxHp,
    ac: toNumber(creature.ac ?? creature.armor_class, 10),
    initiativeMod: toNumber(creature.initiativeMod, dexMod(creature.abilities || creature.stats || creature)),
    conditions: [],
    description: creature.description || creature.notes || '',
    actions: creature.actions || [],
    reactions: creature.reactions || [],
    bonus_actions: creature.bonus_actions || [],
    tokenColor: '#EF4444',
    tokenSize: 40,
  };
}

function hasPlayers(combatants = []) {
  return combatants.some(combatant => combatant.type === 'player');
}

function mergeScenarioWithParty(scenario, players = []) {
  if (!scenario) return null;
  const existing = Array.isArray(scenario.combatants) ? scenario.combatants : [];
  if (hasPlayers(existing)) return scenario;
  const party = players.map(playerToCombatant);
  return {
    ...scenario,
    name: scenario.name || 'Saved Encounter',
    combatants: [...party, ...existing],
    party_auto_added: party.length > 0,
  };
}

export default function CombatTab({ theme, campaignId, scenarios, selectedScenario, setSelectedScenario, launchCombat, quickStartCombat, players }) {
  const [npcs, setNpcs] = useState([]);
  const [creatures, setCreatures] = useState([]);
  const [selected, setSelected] = useState({ players: {}, npcs: {}, creatures: {} });
  const [query, setQuery] = useState('');
  const [loadingLists, setLoadingLists] = useState(false);
  const [savingEncounter, setSavingEncounter] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadQuickLists() {
      try {
        setLoadingLists(true);
        const [npcRes, creatureRes, playtestCreatureRes] = await Promise.all([
          apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
          apiClient.get(`/campaigns/${campaignId}/custom-creatures`).catch(() => ({ data: [] })),
          apiClient.get(`/user/content/playtest-content?${new URLSearchParams({ content_type: 'creatures', campaign_id: campaignId }).toString()}`).catch(() => ({ data: { records: [] } })),
        ]);
        if (!cancelled) {
          const customCreatures = Array.isArray(creatureRes.data) ? creatureRes.data : creatureRes.data?.creatures || [];
          const playtestCreatures = (playtestCreatureRes.data?.records || []).map(playtestCreatureToCreature);
          setNpcs(Array.isArray(npcRes.data) ? npcRes.data : npcRes.data?.npcs || []);
          setCreatures([...customCreatures, ...playtestCreatures]);
        }
      } finally {
        if (!cancelled) setLoadingLists(false);
      }
    }
    if (campaignId) loadQuickLists();
    return () => { cancelled = true; };
  }, [campaignId]);

  const filtered = (items) => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter(item => (item.name || item.character_name || '').toLowerCase().includes(term));
  };

  const selectedCount = Object.values(selected.players).filter(Boolean).length + Object.values(selected.npcs).filter(Boolean).length + Object.values(selected.creatures).reduce((sum, count) => sum + count, 0);
  const enemyCount = Object.values(selected.npcs).filter(Boolean).length + Object.values(selected.creatures).reduce((sum, count) => sum + count, 0);

  const selectedCombatants = useMemo(() => {
    const combatants = [];
    players.forEach(player => {
      if (selected.players[player.id]) combatants.push(playerToCombatant(player));
    });
    npcs.forEach((npc, index) => {
      if (selected.npcs[npc.id]) combatants.push(npcToCombatant(npc, index));
    });
    creatures.forEach((creature, index) => {
      const count = selected.creatures[creature.id] || 0;
      for (let i = 0; i < count; i += 1) {
        combatants.push(creatureToCombatant({ ...creature, name: count > 1 ? `${creature.name || 'Creature'} ${i + 1}` : creature.name }, index + i));
      }
    });
    return combatants;
  }, [players, npcs, creatures, selected]);

  const selectedScenarioWithParty = useMemo(() => mergeScenarioWithParty(selectedScenario, players), [selectedScenario, players]);
  const selectedScenarioAlreadyHasPlayers = hasPlayers(selectedScenario?.combatants || []);
  const quickCombatWarnings = useMemo(() => combatReadinessWarnings(selectedCombatants), [selectedCombatants]);
  const savedEncounterWarnings = useMemo(() => combatReadinessWarnings(selectedScenarioWithParty?.combatants || []), [selectedScenarioWithParty]);
  const initiativePreviewCombatants = selectedCombatants.length ? selectedCombatants : selectedScenarioWithParty?.combatants || [];

  const toggleSelected = (group, id) => {
    setSelected(prev => ({ ...prev, [group]: { ...prev[group], [id]: !prev[group][id] } }));
  };

  const adjustCreatureCount = (id, delta) => {
    setSelected(prev => {
      const next = Math.max(0, (prev.creatures[id] || 0) + delta);
      return { ...prev, creatures: { ...prev.creatures, [id]: next } };
    });
  };

  const selectAllPlayers = () => {
    const nextPlayers = {};
    players.forEach(player => { if (player.id) nextPlayers[player.id] = true; });
    setSelected(prev => ({ ...prev, players: nextPlayers }));
  };

  const clearPlayers = () => setSelected(prev => ({ ...prev, players: {} }));
  const clearEnemies = () => setSelected(prev => ({ ...prev, npcs: {}, creatures: {} }));
  const clearQuickCombat = () => setSelected({ players: {}, npcs: {}, creatures: {} });

  const buildQuickScenario = (name = 'Quick Combat') => ({
    id: `quick-${Date.now()}`,
    name,
    combatants: selectedCombatants,
    show_grid: true,
    grid_size: 40,
  });

  const runQuickCombat = () => {
    if (selectedCombatants.length === 0) {
      toast.error('Pick at least one fighter first');
      return;
    }
    if (quickCombatWarnings.length > 0) toast.warning(`Combat readiness: ${quickCombatWarnings[0]}`);
    launchCombat(buildQuickScenario());
  };

  const launchSavedEncounter = (withParty = true) => {
    if (!selectedScenario) return;
    const scenario = withParty ? selectedScenarioWithParty : selectedScenario;
    if (!scenario) return;
    if (withParty && !selectedScenarioAlreadyHasPlayers && players.length > 0) {
      toast.success('Current party added to saved encounter', { description: `${players.length} player character${players.length === 1 ? '' : 's'} included.` });
    }
    if (combatReadinessWarnings(scenario.combatants || []).length > 0) toast.warning(`Combat readiness: ${combatReadinessWarnings(scenario.combatants || [])[0]}`);
    launchCombat(scenario);
  };

  const saveQuickEncounter = async () => {
    if (selectedCombatants.length === 0) {
      toast.error('Pick fighters before saving an encounter');
      return;
    }
    const defaultName = enemyCount > 0 ? `Quick Encounter (${enemyCount} enemies)` : 'Quick Encounter';
    const name = window.prompt('Save this encounter as:', defaultName);
    if (!name) return;

    try {
      setSavingEncounter(true);
      const response = await apiClient.post(`/campaigns/${campaignId}/combat-scenarios`, {
        name: name.trim(),
        description: 'Saved from Quick Combat picker',
        combatants: selectedCombatants,
      });
      setSelectedScenario?.(response.data);
      toast.success('Encounter saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save encounter');
    } finally {
      setSavingEncounter(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', color: theme.text.primary, fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Swords size={24} style={{ color: theme.accent.primary }} /> Combat Control
      </h2>

      <section style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: 14, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 17, color: theme.text.primary, fontWeight: 900, margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Zap size={18} color={theme.accent.primary} /> Quick Combat</h3>
            <p style={{ color: theme.text.muted, fontSize: 13, margin: '4px 0 0' }}>Pick players, NPCs and creatures, then run combat. Initiative, HP and AC open in the tracker.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={saveQuickEncounter} disabled={savingEncounter || selectedCount === 0} style={{ background: theme.accent.subtle, border: `1px solid ${theme.border}`, color: theme.text.secondary, borderRadius: 0 }}><Save size={15} /> {savingEncounter ? 'Saving...' : 'Save Encounter'}</Button>
            <Button onClick={clearQuickCombat} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text.secondary, borderRadius: 0 }}><X size={15} /> Clear All</Button>
            <Button onClick={runQuickCombat} data-testid="run-quick-combat-btn" style={{ background: theme.accent.primary, color: '#fff', border: 'none', borderRadius: 0, fontWeight: 900 }}><Play size={16} /> Run Combat ({selectedCount})</Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" onClick={selectAllPlayers} style={utilityButtonStyle}><UserCheck size={14} /> Select all players</button>
          <button type="button" onClick={clearPlayers} style={utilityButtonStyle}><Eraser size={14} /> Clear players</button>
          <button type="button" onClick={clearEnemies} style={utilityButtonStyle}><Skull size={14} /> Clear enemies</button>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: theme.text.muted }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search players, NPCs or creatures..." style={{ width: '100%', background: theme.bg.panel, border: `1px solid ${theme.border}`, color: theme.text.primary, padding: '10px 10px 10px 34px', outline: 'none' }} />
        </div>

        {selectedCount > 0 && (
          <div style={selectedStripStyle}>
            {selectedCombatants.slice(0, 10).map(combatant => <span key={combatant.id} style={selectedPillStyle(combatant.type)}>{combatant.name}</span>)}
            {selectedCombatants.length > 10 && <span style={{ color: '#9CA3AF', fontSize: 12 }}>+{selectedCombatants.length - 10} more</span>}
          </div>
        )}

        {quickCombatWarnings.length > 0 && selectedCount > 0 && <ReadinessWarnings warnings={quickCombatWarnings} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
          <PickList title="Players" icon={Users} loading={false} items={filtered(players)} selectedMap={selected.players} onToggle={(id) => toggleSelected('players', id)} />
          <PickList title="NPCs" icon={UserCircle} loading={loadingLists} items={filtered(npcs)} selectedMap={selected.npcs} onToggle={(id) => toggleSelected('npcs', id)} />
          <CreaturePickList title="Creatures" icon={Skull} loading={loadingLists} items={filtered(creatures)} counts={selected.creatures} onAdjust={adjustCreatureCount} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', color: theme.accent.gm, fontWeight: '800', marginBottom: '12px' }}>Saved Encounters</h3>
          {scenarios.length === 0 ? (
            <div style={{ background: theme.bg.card, border: `1px dashed ${theme.border}`, borderRadius: 0, padding: '30px', textAlign: 'center' }}>
              <Swords size={32} style={{ color: theme.text.muted, margin: '0 auto 12px' }} />
              <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '8px' }}>No saved encounters yet</p>
              <p style={{ color: theme.text.muted, fontSize: '13px' }}>Use Quick Combat for fast live play, or create planned encounters in campaign prep.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {scenarios.map(s => {
                const hasParty = hasPlayers(s.combatants || []);
                return (
                  <button key={s.id} data-testid={`encounter-${s.id}`} onClick={() => setSelectedScenario(s)} style={{ padding: '14px 16px', background: selectedScenario?.id === s.id ? theme.accent.gmSubtle : theme.bg.card, border: `1px solid ${selectedScenario?.id === s.id ? theme.accent.gm : theme.border}`, borderLeft: selectedScenario?.id === s.id ? `3px solid ${theme.accent.gm}` : `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.primary, textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ fontWeight: '800', marginBottom: '4px', fontSize: '15px' }}>{s.name}</div>
                    <div style={{ fontSize: '13px', color: theme.text.secondary, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>{s.combatants?.length || 0} saved combatants</span>
                      {hasParty ? <span style={{ color: '#4a7dff' }}>Includes Party</span> : players.length > 0 && <span style={{ color: theme.accent.gm }}>Party can auto-join</span>}
                      {s.map_url && <span style={{ color: theme.accent.gm }}>Has Map</span>}
                      {s.combatants?.some(c => c.loot?.length > 0) && <span style={{ color: '#F59E0B' }}>Has Loot</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '16px', color: theme.accent.gm, fontWeight: '800', marginBottom: '12px' }}>Launch Saved Encounter</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button onClick={() => launchSavedEncounter(true)} data-testid="start-combat-btn" disabled={!selectedScenario} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', fontSize: '16px', background: selectedScenario ? theme.gradient : theme.bg.card, border: 'none', borderRadius: 0, color: theme.text.primary, opacity: selectedScenario ? 1 : 0.5 }}>
              <Play size={18} /> Start Saved Combat + Party <ArrowRight size={16} />
            </Button>
            {selectedScenario && !selectedScenarioAlreadyHasPlayers && (
              <Button onClick={() => launchSavedEncounter(false)} data-testid="start-combat-enemies-only-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.secondary, fontSize: '14px' }}>
                <Skull size={15} /> Start Enemies Only
              </Button>
            )}
            {players.length > 0 && (
              <Button onClick={quickStartCombat} data-testid="quick-combat-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: theme.accent.subtle, border: `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.secondary, fontSize: '15px' }}>
                <Users size={16} /> Start with All Players ({players.length})
              </Button>
            )}
          </div>

          {selectedScenario && (
            <div style={{ marginTop: '20px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: '14px' }}>
              <h4 style={{ fontSize: '15px', color: theme.text.primary, fontWeight: '800', marginBottom: '10px' }}>{selectedScenario.name}</h4>
              {!selectedScenarioAlreadyHasPlayers && players.length > 0 && <p style={partyMergeNoticeStyle}>{players.length} current player character{players.length === 1 ? '' : 's'} will be added when you start with party.</p>}
              {savedEncounterWarnings.length > 0 && <ReadinessWarnings warnings={savedEncounterWarnings} />}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedScenarioWithParty?.combatants?.slice(0, 8).map(c => <div key={c.id} style={{ background: c.type === 'player' ? 'rgba(74,125,255,0.18)' : 'rgba(239,68,68,0.18)', border: `1px solid ${c.type === 'player' ? '#4a7dff' : '#EF4444'}`, padding: '6px 10px', borderRadius: 0, fontSize: '13px', color: theme.text.primary }}>{c.name}{c.loot?.length > 0 && <Coins size={10} style={{ marginLeft: '4px', color: '#F59E0B' }} />}</div>)}
                {(selectedScenarioWithParty?.combatants?.length || 0) > 8 && <div style={{ padding: '6px 10px', fontSize: '13px', color: theme.text.muted }}>+{selectedScenarioWithParty.combatants.length - 8} more</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: '16px' }}>
        <InitiativeTracker theme={theme} campaignId={campaignId} combatants={initiativePreviewCombatants} />
      </div>
    </div>
  );
}

function ReadinessWarnings({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div style={readinessWarningStyle} data-testid="combat-readiness-warnings">
      <AlertTriangle size={15} color="#F59E0B" />
      <div style={{ display: 'grid', gap: 3 }}>
        <strong>Readiness warnings</strong>
        {warnings.map((warning, index) => <span key={`${warning}-${index}`}>{warning}</span>)}
      </div>
    </div>
  );
}

function PickList({ title, icon: Icon, loading, items, selectedMap, onToggle }) {
  return (
    <div style={listWrapStyle}>
      <h4 style={listTitleStyle}><Icon size={16} /> {title}</h4>
      {loading ? <p style={emptyTextStyle}>Loading...</p> : items.length === 0 ? <p style={emptyTextStyle}>Nothing found.</p> : items.slice(0, 60).map(item => {
        const selected = !!selectedMap[item.id];
        return <button key={item.id || item.name} type="button" onClick={() => onToggle(item.id)} style={pickButtonStyle(selected)}><span>{item.name || item.character_name || 'Unnamed'}</span><small>AC {item.ac || item.armor_class || '—'} · HP {item.hp || item.max_hp || item.max_hit_points || '—'}</small></button>;
      })}
    </div>
  );
}

function CreaturePickList({ title, icon: Icon, loading, items, counts, onAdjust }) {
  return (
    <div style={listWrapStyle}>
      <h4 style={listTitleStyle}><Icon size={16} /> {title}</h4>
      {loading ? <p style={emptyTextStyle}>Loading...</p> : items.length === 0 ? <p style={emptyTextStyle}>No custom or private playtest creatures found.</p> : items.slice(0, 60).map(item => {
        const count = counts[item.id] || 0;
        return <div key={item.id || item.name} style={creatureRowStyle(count > 0)}><div style={{ minWidth: 0 }}><strong>{item.name || 'Creature'}</strong><small>AC {item.ac || item.armor_class || '—'} · HP {item.hp || item.maxHp || item.hit_points || '—'}{item.is_playtest_import ? ' · Playtest' : ''}</small></div><div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><button type="button" onClick={() => onAdjust(item.id, -1)} style={countButtonStyle}>−</button><span style={{ minWidth: 18, textAlign: 'center' }}>{count}</span><button type="button" onClick={() => onAdjust(item.id, 1)} style={countButtonStyle}>+</button></div></div>;
      })}
    </div>
  );
}

const readinessWarningStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)', color: '#FDE68A', padding: 10, marginBottom: 12, fontSize: 12, lineHeight: 1.45 };
const partyMergeNoticeStyle = { margin: '0 0 10px', color: '#D1D5DB', background: 'rgba(74,125,255,0.12)', border: '1px solid rgba(74,125,255,0.32)', padding: 9, fontSize: 12, lineHeight: 1.4 };
const listWrapStyle = { background: 'rgba(0,0,0,0.16)', border: '1px solid rgba(239,68,68,0.28)', padding: 10, minHeight: 160 };
const listTitleStyle = { color: '#FFFFFF', fontSize: 14, fontWeight: 900, margin: '0 0 8px', display: 'flex', gap: 7, alignItems: 'center' };
const emptyTextStyle = { color: '#9CA3AF', fontSize: 12, margin: 0 };
const pickButtonStyle = (selected) => ({ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', background: selected ? '#EF4444' : '#27272B', border: `1px solid ${selected ? '#F87171' : 'rgba(239,68,68,0.28)'}`, color: '#FFFFFF', padding: 9, marginBottom: 6, cursor: 'pointer' });
const creatureRowStyle = (selected) => ({ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', background: selected ? 'rgba(239,68,68,0.16)' : '#27272B', border: `1px solid ${selected ? '#F87171' : 'rgba(239,68,68,0.28)'}`, color: '#FFFFFF', padding: 9, marginBottom: 6 });
const countButtonStyle = { width: 28, height: 28, background: '#EF4444', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontWeight: 900 };
const utilityButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#27272B', border: '1px solid rgba(239,68,68,0.28)', color: '#D1D5DB', padding: '8px 10px', fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const selectedStripStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(239,68,68,0.28)', padding: 8, marginBottom: 12 };
const selectedPillStyle = (type) => ({ background: type === 'player' ? 'rgba(74,125,255,0.18)' : 'rgba(239,68,68,0.18)', border: `1px solid ${type === 'player' ? '#4a7dff' : '#EF4444'}`, color: '#FFFFFF', padding: '5px 8px', fontSize: 12, fontWeight: 900 });
