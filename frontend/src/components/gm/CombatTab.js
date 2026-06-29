import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Coins, Eraser, Gift, Play, Save, Search, Skull, Swords, UserCheck, UserCircle, Users, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import InitiativeTracker from './InitiativeTracker';
import apiClient from '@/lib/apiClient';

const toNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const dexMod = (stats = {}) => Math.floor(((toNumber(stats.dexterity, 10)) - 10) / 2);
const EMPTY_LOOT = { name: '', item_type: 'misc', quantity: 1, value: '', description: '', is_magical: false, attunement_required: false, damage_dice: '', damage_type: '', attack_bonus: 0, ac_bonus: 0, equip_slot: '', notes: '' };

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
  const enemiesWithoutActions = combatants.filter(combatant => combatant.type !== 'player' && !combatant.actions?.length && !combatant.description).map(combatant => combatant.name);
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
  return { ...scenario, name: scenario.name || 'Saved Encounter', combatants: [...party, ...existing], party_auto_added: party.length > 0 };
}

function lootPayload(loot) {
  return {
    name: String(loot.name || '').trim(),
    item_type: loot.item_type || 'misc',
    quantity: Math.max(1, Number.parseInt(loot.quantity, 10) || 1),
    value: loot.value || '',
    description: loot.description || '',
    is_magical: Boolean(loot.is_magical),
    attunement_required: Boolean(loot.attunement_required),
    damage_dice: loot.damage_dice || '',
    damage_type: loot.damage_type || '',
    attack_bonus: Number(loot.attack_bonus) || 0,
    ac_bonus: Number(loot.ac_bonus) || 0,
    equip_slot: loot.equip_slot || '',
    notes: loot.notes || 'Added from Combat Loot Drop.',
  };
}

export default function CombatTab({ theme, campaignId, scenarios = [], selectedScenario, setSelectedScenario, launchCombat, quickStartCombat, players = [] }) {
  const [npcs, setNpcs] = useState([]);
  const [creatures, setCreatures] = useState([]);
  const [selected, setSelected] = useState({ players: {}, npcs: {}, creatures: {} });
  const [query, setQuery] = useState('');
  const [loadingLists, setLoadingLists] = useState(false);
  const [savingEncounter, setSavingEncounter] = useState(false);
  const [lootDraft, setLootDraft] = useState(EMPTY_LOOT);
  const [savingLoot, setSavingLoot] = useState(false);

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
    players.forEach(player => { if (selected.players[player.id]) combatants.push(playerToCombatant(player)); });
    npcs.forEach((npc, index) => { if (selected.npcs[npc.id]) combatants.push(npcToCombatant(npc, index)); });
    creatures.forEach((creature, index) => {
      const count = selected.creatures[creature.id] || 0;
      for (let i = 0; i < count; i += 1) combatants.push(creatureToCombatant({ ...creature, name: count > 1 ? `${creature.name || 'Creature'} ${i + 1}` : creature.name }, index + i));
    });
    return combatants;
  }, [players, npcs, creatures, selected]);

  const selectedScenarioWithParty = useMemo(() => mergeScenarioWithParty(selectedScenario, players), [selectedScenario, players]);
  const selectedScenarioAlreadyHasPlayers = hasPlayers(selectedScenario?.combatants || []);
  const quickCombatWarnings = useMemo(() => combatReadinessWarnings(selectedCombatants), [selectedCombatants]);
  const savedEncounterWarnings = useMemo(() => combatReadinessWarnings(selectedScenarioWithParty?.combatants || []), [selectedScenarioWithParty]);
  const initiativePreviewCombatants = selectedCombatants.length ? selectedCombatants : selectedScenarioWithParty?.combatants || [];

  const toggleSelected = (group, id) => setSelected(prev => ({ ...prev, [group]: { ...prev[group], [id]: !prev[group][id] } }));
  const adjustCreatureCount = (id, delta) => setSelected(prev => ({ ...prev, creatures: { ...prev.creatures, [id]: Math.max(0, (prev.creatures[id] || 0) + delta) } }));
  const selectAllPlayers = () => setSelected(prev => ({ ...prev, players: Object.fromEntries(players.filter(player => player.id).map(player => [player.id, true])) }));
  const clearPlayers = () => setSelected(prev => ({ ...prev, players: {} }));
  const clearEnemies = () => setSelected(prev => ({ ...prev, npcs: {}, creatures: {} }));
  const clearQuickCombat = () => setSelected({ players: {}, npcs: {}, creatures: {} });
  const buildQuickScenario = (name = 'Quick Combat') => ({ id: `quick-${Date.now()}`, name, combatants: selectedCombatants, show_grid: true, grid_size: 40 });

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
    if (withParty && !selectedScenarioAlreadyHasPlayers && players.length > 0) toast.success('Current party added to saved encounter', { description: `${players.length} player character${players.length === 1 ? '' : 's'} included.` });
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
      const response = await apiClient.post(`/campaigns/${campaignId}/combat-scenarios`, { name: name.trim(), description: 'Saved from Quick Combat picker', combatants: selectedCombatants });
      setSelectedScenario?.(response.data);
      toast.success('Encounter saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save encounter');
    } finally {
      setSavingEncounter(false);
    }
  };

  const saveCombatLoot = async () => {
    const payload = lootPayload(lootDraft);
    if (!payload.name) {
      toast.error('Name the loot first');
      return;
    }
    setSavingLoot(true);
    try {
      await apiClient.post(`/campaigns/${campaignId}/inventory`, payload);
      setLootDraft(EMPTY_LOOT);
      toast.success(`${payload.name} added to party inventory`, { description: 'Open Inventory & Rewards to grant it to a character, auto-attune, or equip it.' });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not add combat loot');
    } finally {
      setSavingLoot(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '22px', color: theme.text.primary, fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Swords size={24} style={{ color: theme.accent.primary }} /> Combat Control</h2>

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

        {selectedCount > 0 && <div style={selectedStripStyle}>{selectedCombatants.slice(0, 10).map(combatant => <span key={combatant.id} style={selectedPillStyle(combatant.type)}>{combatant.name}</span>)}{selectedCombatants.length > 10 && <span style={{ color: '#9CA3AF', fontSize: 12 }}>+{selectedCombatants.length - 10} more</span>}</div>}
        {quickCombatWarnings.length > 0 && selectedCount > 0 && <ReadinessWarnings warnings={quickCombatWarnings} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
          <PickList title="Players" icon={Users} loading={false} items={filtered(players)} selectedMap={selected.players} onToggle={(id) => toggleSelected('players', id)} />
          <PickList title="NPCs" icon={UserCircle} loading={loadingLists} items={filtered(npcs)} selectedMap={selected.npcs} onToggle={(id) => toggleSelected('npcs', id)} />
          <CreaturePickList title="Creatures" icon={Skull} loading={loadingLists} items={filtered(creatures)} counts={selected.creatures} onAdjust={adjustCreatureCount} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <section>
          <h3 style={{ fontSize: '16px', color: theme.accent.gm, fontWeight: '800', marginBottom: '12px' }}>Saved Encounters</h3>
          {scenarios.length === 0 ? <EmptyEncounter theme={theme} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {scenarios.map(s => {
                const hasParty = hasPlayers(s.combatants || []);
                return <button key={s.id} data-testid={`encounter-${s.id}`} onClick={() => setSelectedScenario(s)} style={{ padding: '14px 16px', background: selectedScenario?.id === s.id ? theme.accent.gmSubtle : theme.bg.card, border: `1px solid ${selectedScenario?.id === s.id ? theme.accent.gm : theme.border}`, borderLeft: selectedScenario?.id === s.id ? `3px solid ${theme.accent.gm}` : `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.primary, textAlign: 'left', cursor: 'pointer' }}><div style={{ fontWeight: 800, marginBottom: 4, fontSize: 15 }}>{s.name}</div><div style={{ fontSize: 13, color: theme.text.secondary, display: 'flex', gap: 12, flexWrap: 'wrap' }}><span>{s.combatants?.length || 0} saved combatants</span>{hasParty ? <span style={{ color: '#4a7dff' }}>Includes Party</span> : players.length > 0 && <span style={{ color: theme.accent.gm }}>Party can auto-join</span>}{s.map_url && <span style={{ color: theme.accent.gm }}>Has Map</span>}{s.combatants?.some(c => c.loot?.length > 0) && <span style={{ color: '#F59E0B' }}>Has Loot</span>}</div></button>;
              })}
            </div>
          )}
        </section>

        <section>
          <h3 style={{ fontSize: '16px', color: theme.accent.gm, fontWeight: '800', marginBottom: '12px' }}>Launch Saved Encounter</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button onClick={() => launchSavedEncounter(true)} data-testid="start-combat-btn" disabled={!selectedScenario} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, fontSize: 16, background: selectedScenario ? theme.gradient : theme.bg.card, border: 'none', borderRadius: 0, color: theme.text.primary, opacity: selectedScenario ? 1 : 0.5 }}><Play size={18} /> Start Saved Combat + Party <ArrowRight size={16} /></Button>
            {selectedScenario && !selectedScenarioAlreadyHasPlayers && <Button onClick={() => launchSavedEncounter(false)} data-testid="start-combat-enemies-only-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.secondary, fontSize: 14 }}><Skull size={15} /> Start Enemies Only</Button>}
            {players.length > 0 && <Button onClick={quickStartCombat} data-testid="quick-combat-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, background: theme.accent.subtle, border: `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.secondary, fontSize: 15 }}><Users size={16} /> Start with All Players ({players.length})</Button>}
          </div>
          {selectedScenario && <SelectedScenarioPreview theme={theme} scenario={selectedScenario} scenarioWithParty={selectedScenarioWithParty} alreadyHasPlayers={selectedScenarioAlreadyHasPlayers} players={players} warnings={savedEncounterWarnings} />}
        </section>
      </div>

      <CombatLootDrop theme={theme} lootDraft={lootDraft} setLootDraft={setLootDraft} savingLoot={savingLoot} onSave={saveCombatLoot} />

      <div style={{ marginTop: 24, background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: 16 }}>
        <InitiativeTracker theme={theme} campaignId={campaignId} combatants={initiativePreviewCombatants} />
      </div>
    </div>
  );
}

function EmptyEncounter({ theme }) {
  return <div style={{ background: theme.bg.card, border: `1px dashed ${theme.border}`, borderRadius: 0, padding: 30, textAlign: 'center' }}><Swords size={32} style={{ color: theme.text.muted, margin: '0 auto 12px' }} /><p style={{ color: theme.text.secondary, fontSize: 14, marginBottom: 8 }}>No saved encounters yet</p><p style={{ color: theme.text.muted, fontSize: 13 }}>Use Quick Combat for fast live play, or create planned encounters in campaign prep.</p></div>;
}

function SelectedScenarioPreview({ theme, scenario, scenarioWithParty, alreadyHasPlayers, players, warnings }) {
  return <div style={{ marginTop: 20, background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: 14 }}><h4 style={{ fontSize: 15, color: theme.text.primary, fontWeight: 800, marginBottom: 10 }}>{scenario.name}</h4>{!alreadyHasPlayers && players.length > 0 && <p style={partyMergeNoticeStyle}>{players.length} current player character{players.length === 1 ? '' : 's'} will be added when you start with party.</p>}{warnings.length > 0 && <ReadinessWarnings warnings={warnings} />}<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{scenarioWithParty?.combatants?.slice(0, 8).map(c => <div key={c.id} style={{ background: c.type === 'player' ? 'rgba(74,125,255,0.18)' : 'rgba(239,68,68,0.18)', border: `1px solid ${c.type === 'player' ? '#4a7dff' : '#EF4444'}`, padding: '6px 10px', borderRadius: 0, fontSize: 13, color: theme.text.primary }}>{c.name}{c.loot?.length > 0 && <Coins size={10} style={{ marginLeft: 4, color: '#F59E0B' }} />}</div>)}{(scenarioWithParty?.combatants?.length || 0) > 8 && <div style={{ padding: '6px 10px', fontSize: 13, color: theme.text.muted }}>+{scenarioWithParty.combatants.length - 8} more</div>}</div></div>;
}

function CombatLootDrop({ theme, lootDraft, setLootDraft, savingLoot, onSave }) {
  const set = (patch) => setLootDraft({ ...lootDraft, ...patch });
  const itemType = lootDraft.item_type || 'misc';
  const isGear = ['weapon', 'armor', 'magic_item'].includes(itemType);
  return (
    <section style={{ marginTop: 22, background: theme.bg.card, border: `1px solid ${theme.border}`, borderLeft: `5px solid ${theme.accent.primary}`, padding: 14 }} data-testid="combat-loot-drop-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, color: theme.accent.gm, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={18} /> Combat Loot Drop</h3>
          <p style={{ color: theme.text.muted, fontSize: 13, margin: '4px 0 0' }}>Add post-fight rewards into party inventory first, including weapon/armour fields needed for later auto-attune and equip handoff.</p>
        </div>
        <Button onClick={onSave} disabled={savingLoot || !lootDraft.name?.trim()} style={{ background: theme.accent.primary, color: '#fff', border: 'none', borderRadius: 0, fontWeight: 900 }}><Save size={15} /> {savingLoot ? 'Adding...' : 'Add to Party Loot'}</Button>
      </div>
      <div style={lootGridStyle}>
        <input value={lootDraft.name} onChange={event => set({ name: event.target.value })} placeholder="Reward name" style={combatInputStyle(theme)} />
        <select value={lootDraft.item_type} onChange={event => set({ item_type: event.target.value })} style={combatInputStyle(theme)}><option value="weapon">Weapon</option><option value="armor">Armour</option><option value="potion">Potion</option><option value="scroll">Scroll</option><option value="gem">Gem / valuable</option><option value="magic_item">Magic item</option><option value="misc">Misc</option></select>
        <input type="number" min="1" value={lootDraft.quantity} onChange={event => set({ quantity: event.target.value })} placeholder="Qty" style={combatInputStyle(theme)} />
        <input value={lootDraft.value} onChange={event => set({ value: event.target.value })} placeholder="Value, e.g. 50 gp" style={combatInputStyle(theme)} />
        <input value={lootDraft.description} onChange={event => set({ description: event.target.value })} placeholder="Description or effect" style={{ ...combatInputStyle(theme), gridColumn: 'span 2' }} />
        <label style={lootCheckStyle(theme)}><input type="checkbox" checked={Boolean(lootDraft.is_magical)} onChange={event => set({ is_magical: event.target.checked })} /> Magical</label>
        <label style={lootCheckStyle(theme)}><input type="checkbox" checked={Boolean(lootDraft.attunement_required)} onChange={event => set({ attunement_required: event.target.checked, is_magical: event.target.checked ? true : lootDraft.is_magical })} /> Requires attunement</label>
        {isGear && <input value={lootDraft.damage_dice} onChange={event => set({ damage_dice: event.target.value })} placeholder="Damage, e.g. 1d8+1" style={combatInputStyle(theme)} />}
        {isGear && <input value={lootDraft.damage_type} onChange={event => set({ damage_type: event.target.value })} placeholder="Damage type" style={combatInputStyle(theme)} />}
        {isGear && <input type="number" value={lootDraft.attack_bonus} onChange={event => set({ attack_bonus: event.target.value })} placeholder="Attack bonus" style={combatInputStyle(theme)} />}
        {isGear && <input type="number" value={lootDraft.ac_bonus} onChange={event => set({ ac_bonus: event.target.value })} placeholder="AC bonus" style={combatInputStyle(theme)} />}
        {isGear && <input value={lootDraft.equip_slot} onChange={event => set({ equip_slot: event.target.value })} placeholder="Equip slot, e.g. mainHand, armor, shield" style={combatInputStyle(theme)} />}
        <input value={lootDraft.notes} onChange={event => set({ notes: event.target.value })} placeholder="GM notes, optional" style={{ ...combatInputStyle(theme), gridColumn: 'span 2' }} />
      </div>
    </section>
  );
}

function ReadinessWarnings({ warnings }) {
  if (!warnings?.length) return null;
  return <div style={readinessWarningStyle} data-testid="combat-readiness-warnings"><AlertTriangle size={15} color="#F59E0B" /><div style={{ display: 'grid', gap: 3 }}><strong>Readiness warnings</strong>{warnings.map((warning, index) => <span key={`${warning}-${index}`}>{warning}</span>)}</div></div>;
}

function PickList({ title, icon: Icon, loading, items, selectedMap, onToggle }) {
  return <div style={listWrapStyle}><h4 style={listTitleStyle}><Icon size={16} /> {title}</h4>{loading ? <p style={emptyTextStyle}>Loading...</p> : items.length === 0 ? <p style={emptyTextStyle}>Nothing found.</p> : items.slice(0, 60).map(item => { const selected = !!selectedMap[item.id]; return <button key={item.id || item.name} type="button" onClick={() => onToggle(item.id)} style={pickButtonStyle(selected)}><span>{item.name || item.character_name || 'Unnamed'}</span><small>AC {item.ac || item.armor_class || '—'} · HP {item.hp || item.max_hp || item.max_hit_points || '—'}</small></button>; })}</div>;
}

function CreaturePickList({ title, icon: Icon, loading, items, counts, onAdjust }) {
  return <div style={listWrapStyle}><h4 style={listTitleStyle}><Icon size={16} /> {title}</h4>{loading ? <p style={emptyTextStyle}>Loading...</p> : items.length === 0 ? <p style={emptyTextStyle}>No custom or private playtest creatures found.</p> : items.slice(0, 60).map(item => { const count = counts[item.id] || 0; return <div key={item.id || item.name} style={creatureRowStyle(count > 0)}><div style={{ minWidth: 0 }}><strong>{item.name || 'Creature'}</strong><small>AC {item.ac || item.armor_class || '—'} · HP {item.hp || item.maxHp || item.hit_points || '—'}{item.is_playtest_import ? ' · Playtest' : ''}</small></div><div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><button type="button" onClick={() => onAdjust(item.id, -1)} style={countButtonStyle}>−</button><span style={{ minWidth: 18, textAlign: 'center' }}>{count}</span><button type="button" onClick={() => onAdjust(item.id, 1)} style={countButtonStyle}>+</button></div></div>; })}</div>;
}

const combatInputStyle = (theme) => ({ minHeight: 36, width: '100%', background: theme.bg.panel, border: `1px solid ${theme.border}`, color: theme.text.primary, padding: '0 9px', outline: 'none' });
const lootGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 };
const lootCheckStyle = (theme) => ({ minHeight: 36, display: 'flex', alignItems: 'center', gap: 7, color: theme.text.secondary, fontSize: 13, fontWeight: 800, background: 'rgba(0,0,0,0.16)', border: `1px solid ${theme.border}`, padding: '0 9px' });
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
