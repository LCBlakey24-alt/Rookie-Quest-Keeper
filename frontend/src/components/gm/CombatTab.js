import React, { useEffect, useMemo, useState } from 'react';
import { Swords, Users, Coins, Play, ArrowRight, Zap, Skull, UserCircle, Search, X } from 'lucide-react';
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
    name: player.name || 'Player Character',
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

export default function CombatTab({ theme, campaignId, scenarios, selectedScenario, setSelectedScenario, launchCombat, quickStartCombat, players, setShowQuickCombat }) {
  const [npcs, setNpcs] = useState([]);
  const [creatures, setCreatures] = useState([]);
  const [selected, setSelected] = useState({ players: {}, npcs: {}, creatures: {} });
  const [query, setQuery] = useState('');
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadQuickLists() {
      try {
        setLoadingLists(true);
        const [npcRes, creatureRes] = await Promise.all([
          apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
          apiClient.get(`/campaigns/${campaignId}/custom-creatures`).catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setNpcs(Array.isArray(npcRes.data) ? npcRes.data : npcRes.data?.npcs || []);
          setCreatures(Array.isArray(creatureRes.data) ? creatureRes.data : creatureRes.data?.creatures || []);
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
    return items.filter(item => (item.name || '').toLowerCase().includes(term));
  };

  const selectedCount = Object.values(selected.players).filter(Boolean).length + Object.values(selected.npcs).filter(Boolean).length + Object.values(selected.creatures).reduce((sum, count) => sum + count, 0);

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
      for (let i = 0; i < count; i += 1) combatants.push(creatureToCombatant({ ...creature, name: count > 1 ? `${creature.name || 'Creature'} ${i + 1}` : creature.name }, index + i));
    });
    return combatants;
  }, [players, npcs, creatures, selected]);

  const toggleSelected = (group, id) => {
    setSelected(prev => ({
      ...prev,
      [group]: { ...prev[group], [id]: !prev[group][id] }
    }));
  };

  const adjustCreatureCount = (id, delta) => {
    setSelected(prev => {
      const next = Math.max(0, (prev.creatures[id] || 0) + delta);
      return { ...prev, creatures: { ...prev.creatures, [id]: next } };
    });
  };

  const clearQuickCombat = () => setSelected({ players: {}, npcs: {}, creatures: {} });

  const runQuickCombat = () => {
    if (selectedCombatants.length === 0) {
      toast.error('Pick at least one fighter first');
      return;
    }
    launchCombat({
      id: `quick-${Date.now()}`,
      name: 'Quick Combat',
      combatants: selectedCombatants,
      show_grid: true,
      grid_size: 40,
    });
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
            <Button onClick={clearQuickCombat} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text.secondary, borderRadius: 0 }}><X size={15} /> Clear</Button>
            <Button onClick={runQuickCombat} data-testid="run-quick-combat-btn" style={{ background: theme.accent.primary, color: '#fff', border: 'none', borderRadius: 0, fontWeight: 900 }}><Play size={16} /> Run Combat ({selectedCount})</Button>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: theme.text.muted }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search players, NPCs or creatures..." style={{ width: '100%', background: theme.bg.panel, border: `1px solid ${theme.border}`, color: theme.text.primary, padding: '10px 10px 10px 34px', outline: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
          <PickList title="Players" icon={Users} loading={false} items={filtered(players)} selectedMap={selected.players} onToggle={(id) => toggleSelected('players', id)} type="checkbox" />
          <PickList title="NPCs" icon={UserCircle} loading={loadingLists} items={filtered(npcs)} selectedMap={selected.npcs} onToggle={(id) => toggleSelected('npcs', id)} type="checkbox" />
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
              {scenarios.map(s => (
                <button key={s.id} data-testid={`encounter-${s.id}`} onClick={() => setSelectedScenario(s)} style={{ padding: '14px 16px', background: selectedScenario?.id === s.id ? theme.accent.gmSubtle : theme.bg.card, border: `1px solid ${selectedScenario?.id === s.id ? theme.accent.gm : theme.border}`, borderLeft: selectedScenario?.id === s.id ? `3px solid ${theme.accent.gm}` : `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.primary, textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontWeight: '800', marginBottom: '4px', fontSize: '15px' }}>{s.name}</div>
                  <div style={{ fontSize: '13px', color: theme.text.secondary, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>{s.combatants?.length || 0} combatants</span>
                    {s.map_url && <span style={{ color: theme.accent.gm }}>Has Map</span>}
                    {s.combatants?.some(c => c.loot?.length > 0) && <span style={{ color: '#F59E0B' }}>Has Loot</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '16px', color: theme.accent.gm, fontWeight: '800', marginBottom: '12px' }}>Launch Saved Encounter</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button onClick={() => selectedScenario && launchCombat(selectedScenario)} data-testid="start-combat-btn" disabled={!selectedScenario} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', fontSize: '16px', background: selectedScenario ? theme.gradient : theme.bg.card, border: 'none', borderRadius: 0, color: theme.text.primary, opacity: selectedScenario ? 1 : 0.5 }}>
              <Play size={18} /> Start Saved Combat <ArrowRight size={16} />
            </Button>
            {players.length > 0 && (
              <Button onClick={quickStartCombat} data-testid="quick-combat-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: theme.accent.subtle, border: `1px solid ${theme.border}`, borderRadius: 0, color: theme.text.secondary, fontSize: '15px' }}>
                <Users size={16} /> Start with All Players ({players.length})
              </Button>
            )}
          </div>

          {selectedScenario && (
            <div style={{ marginTop: '20px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: '14px' }}>
              <h4 style={{ fontSize: '15px', color: theme.text.primary, fontWeight: '800', marginBottom: '10px' }}>{selectedScenario.name}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedScenario.combatants?.slice(0, 6).map(c => <div key={c.id} style={{ background: c.type === 'player' ? 'rgba(74,125,255,0.18)' : 'rgba(239,68,68,0.18)', border: `1px solid ${c.type === 'player' ? '#4a7dff' : '#EF4444'}`, padding: '6px 10px', borderRadius: 0, fontSize: '13px', color: theme.text.primary }}>{c.name}{c.loot?.length > 0 && <Coins size={10} style={{ marginLeft: '4px', color: '#F59E0B' }} />}</div>)}
                {selectedScenario.combatants?.length > 6 && <div style={{ padding: '6px 10px', fontSize: '13px', color: theme.text.muted }}>+{selectedScenario.combatants.length - 6} more</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px', background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: 0, padding: '16px' }}>
        <InitiativeTracker theme={theme} campaignId={campaignId} combatants={selectedCombatants.length ? selectedCombatants : selectedScenario?.combatants || []} />
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
        return <button key={item.id || item.name} type="button" onClick={() => onToggle(item.id)} style={pickButtonStyle(selected)}><span>{item.name || 'Unnamed'}</span><small>AC {item.ac || item.armor_class || '—'} · HP {item.hp || item.max_hp || item.max_hit_points || '—'}</small></button>;
      })}
    </div>
  );
}

function CreaturePickList({ title, icon: Icon, loading, items, counts, onAdjust }) {
  return (
    <div style={listWrapStyle}>
      <h4 style={listTitleStyle}><Icon size={16} /> {title}</h4>
      {loading ? <p style={emptyTextStyle}>Loading...</p> : items.length === 0 ? <p style={emptyTextStyle}>No custom creatures found.</p> : items.slice(0, 60).map(item => {
        const count = counts[item.id] || 0;
        return <div key={item.id || item.name} style={creatureRowStyle(count > 0)}><div style={{ minWidth: 0 }}><strong>{item.name || 'Creature'}</strong><small>AC {item.ac || item.armor_class || '—'} · HP {item.hp || item.maxHp || item.hit_points || '—'}</small></div><div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><button type="button" onClick={() => onAdjust(item.id, -1)} style={countButtonStyle}>−</button><span style={{ minWidth: 18, textAlign: 'center' }}>{count}</span><button type="button" onClick={() => onAdjust(item.id, 1)} style={countButtonStyle}>+</button></div></div>;
      })}
    </div>
  );
}

const listWrapStyle = { background: 'rgba(0,0,0,0.16)', border: '1px solid rgba(239,68,68,0.28)', padding: 10, minHeight: 160 };
const listTitleStyle = { color: '#FFFFFF', fontSize: 14, fontWeight: 900, margin: '0 0 8px', display: 'flex', gap: 7, alignItems: 'center' };
const emptyTextStyle = { color: '#9CA3AF', fontSize: 12, margin: 0 };
const pickButtonStyle = (selected) => ({ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', background: selected ? '#EF4444' : '#27272B', border: `1px solid ${selected ? '#F87171' : 'rgba(239,68,68,0.28)'}`, color: '#FFFFFF', padding: 9, marginBottom: 6, cursor: 'pointer' });
const creatureRowStyle = (selected) => ({ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', background: selected ? 'rgba(239,68,68,0.16)' : '#27272B', border: `1px solid ${selected ? '#F87171' : 'rgba(239,68,68,0.28)'}`, color: '#FFFFFF', padding: 9, marginBottom: 6 });
const countButtonStyle = { width: 28, height: 28, background: '#EF4444', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontWeight: 900 };
