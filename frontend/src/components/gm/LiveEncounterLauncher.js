import React, { useEffect, useMemo, useState } from 'react';
import { Check, Play, Plus, Search, Swords, Trash2, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const EMPTY_QUICK = { name: '', quantity: 1, hp: 10, ac: 10, initiative: 0 };
const safeArray = value => Array.isArray(value) ? value : [];

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dexMod(source = {}) {
  const dex = source?.stats?.dexterity ?? source?.dexterity ?? source?.abilities?.dexterity ?? 10;
  return Math.floor((numberOr(dex, 10) - 10) / 2);
}

export function playerToCombatant(player) {
  const maxHp = numberOr(player.max_hp ?? player.maxHitPoints ?? player.max_hit_points ?? player.hp, 10);
  const tempHp = Math.max(0, numberOr(player.temporary_hit_points ?? player.temp_hp ?? player.tempHp, 0));
  return {
    id: player.id || `player-${player.name || player.character_name}`,
    character_id: player.character_id || null,
    legacy_player_id: player.legacy_player_id || null,
    name: player.name || player.character_name || 'Player Character',
    type: 'player',
    hp: numberOr(player.hp ?? player.current_hp ?? player.current_hit_points, maxHp),
    maxHp,
    tempHp,
    ac: numberOr(player.ac ?? player.armor_class, 10),
    initiativeMod: numberOr(player.initiativeMod, dexMod(player)),
    conditions: safeArray(player.conditions),
    deathSaves: {
      successes: Math.max(0, Math.min(3, numberOr(player.death_saves_successes ?? player.deathSaves?.successes, 0))),
      failures: Math.max(0, Math.min(3, numberOr(player.death_saves_failures ?? player.deathSaves?.failures, 0))),
    },
    concentrating_on: String(player.concentrating_on ?? player.concentration ?? ''),
    source: player.source || 'legacy',
    rqk_pending_combat_sync: Boolean(player.rqk_pending_combat_sync),
    tokenColor: '#4a7dff', tokenSize: 40,
  };
}

function npcToCombatant(npc) {
  const maxHp = numberOr(npc.hp ?? npc.max_hp ?? npc.hit_points, 10);
  return {
    id: npc.id || `npc-${npc.name}`,
    name: npc.name || 'NPC', type: 'npc', hp: maxHp, maxHp,
    ac: numberOr(npc.ac ?? npc.armor_class, 10),
    initiativeMod: numberOr(npc.initiativeMod, dexMod(npc)),
    conditions: [], description: npc.description || npc.notes || '',
    actions: npc.actions || npc.attacks || [], reactions: npc.reactions || [], bonus_actions: npc.bonus_actions || [],
    tokenColor: '#d00000', tokenSize: 40,
  };
}

function keyFor(item, index = 0) {
  return String(item?.id || `${item?.type || 'combatant'}:${item?.name || 'unknown'}:${index}`);
}

function sameCombatant(a, b) {
  if (a?.id && b?.id && a.id === b.id) return true;
  return Boolean(a?.name && b?.name && String(a.name).toLowerCase() === String(b.name).toLowerCase() && (a.type || '') === (b.type || ''));
}

function appendUnique(list, combatant) {
  return list.some(existing => sameCombatant(existing, combatant)) ? list : [...list, combatant];
}

export default function LiveEncounterLauncher({ campaignId }) {
  const navigate = useNavigate();
  const [campaignName, setCampaignName] = useState('Campaign');
  const [scenarios, setScenarios] = useState([]);
  const [players, setPlayers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [travellingIds, setTravellingIds] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [enabledBaseKeys, setEnabledBaseKeys] = useState([]);
  const [includedPlayerIds, setIncludedPlayerIds] = useState([]);
  const [includedCompanionIds, setIncludedCompanionIds] = useState([]);
  const [extraNpcIds, setExtraNpcIds] = useState([]);
  const [queuedNpcIds, setQueuedNpcIds] = useState([]);
  const [npcSearch, setNpcSearch] = useState('');
  const [quickCombatants, setQuickCombatants] = useState([]);
  const [quickDraft, setQuickDraft] = useState(EMPTY_QUICK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [campaignRes, scenarioRes, playerRes, npcRes, stateRes] = await Promise.all([
          apiClient.get(`/campaigns/${campaignId}`).catch(() => ({ data: null })),
          apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
          apiClient.get(`/campaigns/${campaignId}/live-party`).catch(() => apiClient.get(`/campaigns/${campaignId}/players`).catch(() => ({ data: [] }))),
          apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
          apiClient.get(`/campaigns/${campaignId}/live-state`).catch(() => ({ data: { companion_npc_ids: [] } })),
        ]);
        const loadedScenarios = safeArray(scenarioRes.data);
        const loadedPlayers = safeArray(playerRes.data);
        const loadedNpcs = safeArray(npcRes.data);
        setCampaignName(campaignRes.data?.name || 'Campaign');
        setScenarios(loadedScenarios);
        setPlayers(loadedPlayers);
        setNpcs(loadedNpcs);
        setTravellingIds(safeArray(stateRes.data?.companion_npc_ids));
        setIncludedPlayerIds(loadedPlayers.map(player => player.id).filter(Boolean));

        let requested = '';
        let queued = [];
        try {
          requested = localStorage.getItem(`gm.questEncounter.${campaignId}`) || localStorage.getItem(`gm.lastEncounter.${campaignId}`) || '';
          localStorage.removeItem(`gm.questEncounter.${campaignId}`);
          const rawQueue = JSON.parse(localStorage.getItem(`gm.liveEncounterNpcQueue.${campaignId}`) || '[]');
          queued = safeArray(rawQueue).filter(id => loadedNpcs.some(npc => npc.id === id));
          localStorage.removeItem(`gm.liveEncounterNpcQueue.${campaignId}`);
        } catch { /* ignore */ }
        setQueuedNpcIds(queued);
        setSelectedId(loadedScenarios.some(item => item.id === requested) ? requested : (loadedScenarios[0]?.id || ''));
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Could not load saved encounters');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId]);

  const selected = useMemo(() => scenarios.find(item => item.id === selectedId) || null, [scenarios, selectedId]);
  const baseCombatants = useMemo(() => safeArray(selected?.combatants), [selected]);
  const companionNpcs = useMemo(() => travellingIds.map(id => npcs.find(npc => npc.id === id)).filter(Boolean), [npcs, travellingIds]);
  const queuedNpcs = useMemo(() => queuedNpcIds.map(id => npcs.find(npc => npc.id === id)).filter(Boolean), [npcs, queuedNpcIds]);

  useEffect(() => {
    setEnabledBaseKeys(baseCombatants.map((item, index) => keyFor(item, index)));
    setIncludedCompanionIds([]);
    setExtraNpcIds([]);
    setNpcSearch('');
    setQuickCombatants([]);
    setQuickDraft(EMPTY_QUICK);
  }, [selectedId, baseCombatants]);

  const otherNpcs = useMemo(() => {
    const term = npcSearch.trim().toLowerCase();
    return npcs.filter(npc => !travellingIds.includes(npc.id) && !queuedNpcIds.includes(npc.id) && (!term || [npc.name, npc.role, npc.occupation, npc.location].some(value => String(value || '').toLowerCase().includes(term))));
  }, [npcSearch, npcs, queuedNpcIds, travellingIds]);

  const toggle = (value, list, setter) => setter(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);

  const addQuickCombatants = () => {
    const name = String(quickDraft.name || '').trim();
    if (!name) return;
    const quantity = Math.max(1, Math.min(20, Math.floor(numberOr(quickDraft.quantity, 1))));
    const hp = Math.max(1, Math.floor(numberOr(quickDraft.hp, 10)));
    const ac = Math.max(1, Math.floor(numberOr(quickDraft.ac, 10)));
    const initiativeMod = Math.floor(numberOr(quickDraft.initiative, 0));
    const stamp = Date.now();
    const created = Array.from({ length: quantity }, (_, index) => ({
      id: `quick-${stamp}-${index}`,
      name: quantity === 1 ? name : `${name} ${index + 1}`,
      type: 'enemy', hp, maxHp: hp, ac, initiativeMod, conditions: [], tokenColor: '#d00000', tokenSize: 40, temporary: true,
    }));
    setQuickCombatants(prev => [...prev, ...created]);
    setQuickDraft(prev => ({ ...EMPTY_QUICK, hp: prev.hp, ac: prev.ac, initiative: prev.initiative }));
    toast.success(`${quantity} temporary combatant${quantity === 1 ? '' : 's'} added`);
  };

  const launch = () => {
    if (!selected) return;
    let combatants = [];
    baseCombatants.forEach((combatant, index) => {
      if (enabledBaseKeys.includes(keyFor(combatant, index))) combatants = appendUnique(combatants, combatant);
    });
    players.filter(player => includedPlayerIds.includes(player.id)).forEach(player => { combatants = appendUnique(combatants, playerToCombatant(player)); });
    companionNpcs.filter(npc => includedCompanionIds.includes(npc.id)).forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    queuedNpcs.forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    npcs.filter(npc => extraNpcIds.includes(npc.id)).forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    quickCombatants.forEach(combatant => { combatants = appendUnique(combatants, combatant); });

    try { localStorage.setItem(`gm.lastEncounter.${campaignId}`, selected.id || ''); } catch { /* ignore */ }
    navigate(`/combat/${campaignId}`, {
      state: { scenario: { ...selected, combatants, name: selected.name || 'Live Encounter' }, campaignId, campaignName, source: 'live-play' },
    });
  };

  if (loading) return <div style={emptyStyle}>Loading encounters…</div>;
  if (!scenarios.length) return <div style={emptyStyle}>No saved encounters yet. Build one in Campaign Prep, then it will appear here.</div>;

  return (
    <div data-testid="live-encounter-launcher" style={shellStyle}>
      <header style={headerStyle}>
        <span style={{ minWidth: 0 }}><strong style={headerTitleStyle}><Swords size={17} /> Encounter Review</strong><span style={headerMetaStyle}>Choose who is in this fight, then start.</span></span>
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)} style={selectStyle}>
          {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name || 'Untitled Encounter'}</option>)}
        </select>
      </header>

      {selected?.description && <div style={descriptionStyle}>{selected.description}</div>}

      {queuedNpcs.length > 0 && (
        <ParticipantSection title="Added from NPCs" count={queuedNpcs.length} accent>
          {queuedNpcs.map(npc => <ToggleRow key={npc.id} checked title={npc.name} meta={`${npc.role || npc.occupation || 'NPC'} · queued`} onClick={() => setQueuedNpcIds(prev => prev.filter(id => id !== npc.id))} />)}
        </ParticipantSection>
      )}

      <ParticipantSection title="Prepared" count={baseCombatants.length}>
        {baseCombatants.length === 0 && <span style={mutedStyle}>No saved participants.</span>}
        {baseCombatants.map((combatant, index) => {
          const key = keyFor(combatant, index);
          return <ToggleRow key={key} checked={enabledBaseKeys.includes(key)} title={combatant.name || 'Combatant'} meta={combatant.type || 'Prepared'} onClick={() => toggle(key, enabledBaseKeys, setEnabledBaseKeys)} />;
        })}
      </ParticipantSection>

      <ParticipantSection title="Party" count={players.length}>
        {players.length === 0 && <span style={mutedStyle}>No linked player characters yet.</span>}
        {players.map(player => {
          const temp = numberOr(player.temporary_hit_points ?? player.temp_hp, 0);
          const pending = player.rqk_pending_combat_sync ? ' · Offline queued' : '';
          return <ToggleRow key={player.id} checked={includedPlayerIds.includes(player.id)} title={player.name || player.character_name || 'Player'} meta={`${player.character_class || 'Player'}${player.level ? ` · L${player.level}` : ''} · HP ${player.hp ?? '?'} / ${player.max_hp ?? '?'}${temp ? ` +${temp} temp` : ''} · AC ${player.ac ?? '?'}${pending}`} onClick={() => toggle(player.id, includedPlayerIds, setIncludedPlayerIds)} />;
        })}
      </ParticipantSection>

      {companionNpcs.length > 0 && (
        <ParticipantSection title="Travelling NPCs" count={companionNpcs.length} accent>
          {companionNpcs.map(npc => <ToggleRow key={npc.id} checked={includedCompanionIds.includes(npc.id)} title={npc.name} meta={`${npc.role || npc.occupation || 'NPC'} · suggested`} onClick={() => toggle(npc.id, includedCompanionIds, setIncludedCompanionIds)} />)}
        </ParticipantSection>
      )}

      <details key={`quick-${selectedId}`} open={baseCombatants.length === 0 ? true : undefined} style={detailsStyle}>
        <summary style={summaryStyle}><Plus size={14} /> Quick Combatant <span style={countStyle}>{quickCombatants.length}</span></summary>
        <div style={detailsBodyStyle}>
          <div style={quickFormStyle}>
            <input value={quickDraft.name} onChange={event => setQuickDraft(prev => ({ ...prev, name: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addQuickCombatants(); } }} placeholder="Name" style={{ ...inputStyle, gridColumn: 'span 2' }} />
            <NumberField label="Qty" value={quickDraft.quantity} min="1" onChange={value => setQuickDraft(prev => ({ ...prev, quantity: value }))} />
            <NumberField label="HP" value={quickDraft.hp} min="1" onChange={value => setQuickDraft(prev => ({ ...prev, hp: value }))} />
            <NumberField label="AC" value={quickDraft.ac} min="1" onChange={value => setQuickDraft(prev => ({ ...prev, ac: value }))} />
            <NumberField label="Init" value={quickDraft.initiative} onChange={value => setQuickDraft(prev => ({ ...prev, initiative: value }))} />
            <button type="button" onClick={addQuickCombatants} disabled={!String(quickDraft.name || '').trim()} style={addButtonStyle}><Plus size={13} /> Add</button>
          </div>
          {quickCombatants.length > 0 && <div style={rowsStyle}>{quickCombatants.map(item => <div key={item.id} style={quickRowStyle}><span style={{ minWidth: 0 }}><strong style={rowTitleStyle}>{item.name}</strong><span style={rowMetaStyle}>HP {item.maxHp} · AC {item.ac} · Init {item.initiativeMod >= 0 ? '+' : ''}{item.initiativeMod}</span></span><button type="button" onClick={() => setQuickCombatants(prev => prev.filter(combatant => combatant.id !== item.id))} style={removeStyle}><Trash2 size={12} /></button></div>)}</div>}
        </div>
      </details>

      <details style={detailsStyle}>
        <summary style={summaryStyle}><UserPlus size={14} /> Add saved NPC <span style={countStyle}>{extraNpcIds.length}</span></summary>
        <div style={detailsBodyStyle}>
          <label style={searchStyle}><Search size={13} /><input value={npcSearch} onChange={event => setNpcSearch(event.target.value)} placeholder="Search NPCs" style={searchInputStyle} /></label>
          <div style={rowsStyle}>{otherNpcs.slice(0, 12).map(npc => <ToggleRow key={npc.id} checked={extraNpcIds.includes(npc.id)} title={npc.name} meta={`${npc.role || npc.occupation || 'NPC'}${npc.location ? ` · ${npc.location}` : ''}`} onClick={() => toggle(npc.id, extraNpcIds, setExtraNpcIds)} />)}</div>
        </div>
      </details>

      <footer style={footerStyle}>
        <span style={footerTextStyle}>This run does not rewrite the saved encounter.</span>
        <button type="button" onClick={launch} style={launchButtonStyle}><Play size={15} /> Start Encounter</button>
      </footer>
    </div>
  );
}

function ParticipantSection({ title, count, children, accent = false }) {
  return <section style={{ ...sectionStyle, borderLeft: accent ? `4px solid ${rq.red}` : `1px solid ${rq.line}` }}><div style={sectionHeaderStyle}><strong>{title}</strong><span>{count}</span></div><div style={rowsStyle}>{children}</div></section>;
}

function ToggleRow({ checked, title, meta, onClick }) {
  return <button type="button" onClick={onClick} style={rowStyle(checked)}><span style={checkStyle(checked)}>{checked ? <Check size={11} /> : <X size={10} />}</span><span style={{ minWidth: 0, textAlign: 'left' }}><strong style={rowTitleStyle}>{title}</strong><span style={rowMetaStyle}>{meta}</span></span></button>;
}

function NumberField({ label, value, min, onChange }) {
  return <label style={numberFieldStyle}><span>{label}</span><input type="number" min={min} value={value} onChange={event => onChange(event.target.value)} style={numberInputStyle} /></label>;
}

const shellStyle = { display: 'grid', gap: 6, color: rq.text };
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `4px solid ${rq.red}`, padding: 8 };
const headerTitleStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: rq.text };
const headerMetaStyle = { display: 'block', color: rq.muted, fontSize: 9, marginTop: 2 };
const selectStyle = { minHeight: 34, flex: '1 1 210px', maxWidth: 360, minWidth: 0, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 8px', fontSize: 10 };
const descriptionStyle = { background: rq.bg, border: `1px solid ${rq.line}`, color: rq.soft, padding: 7, fontSize: 10, lineHeight: 1.35, maxHeight: 90, overflowY: 'auto' };
const sectionStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 6, display: 'grid', gap: 5 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 6, color: rq.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em' };
const rowsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 4 };
const rowStyle = checked => ({ minHeight: 40, background: checked ? rq.card : rq.bg, border: `1px solid ${checked ? rq.red : rq.line}`, color: rq.text, padding: '4px 6px', display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', alignItems: 'center', gap: 6, cursor: 'pointer' });
const checkStyle = checked => ({ width: 21, height: 21, display: 'grid', placeItems: 'center', background: checked ? rq.red : rq.card, color: checked ? '#fff' : rq.muted, border: `1px solid ${checked ? rq.red : rq.line}` });
const rowTitleStyle = { display: 'block', color: rq.text, fontSize: 10, fontWeight: 950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const rowMetaStyle = { display: 'block', color: rq.muted, fontSize: 8, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const detailsStyle = { background: rq.panel, border: `1px solid ${rq.line}` };
const summaryStyle = { minHeight: 36, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 5, color: rq.soft, cursor: 'pointer', fontSize: 10, fontWeight: 900, listStyle: 'none' };
const countStyle = { marginLeft: 'auto', color: rq.muted, fontSize: 8 };
const detailsBodyStyle = { borderTop: `1px solid ${rq.line}`, padding: 6, display: 'grid', gap: 5 };
const quickFormStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(70px,1fr))', gap: 4, alignItems: 'end' };
const inputStyle = { minHeight: 34, minWidth: 0, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px', fontSize: 10 };
const numberFieldStyle = { display: 'grid', gap: 2, color: rq.muted, fontSize: 7, fontWeight: 900, textTransform: 'uppercase' };
const numberInputStyle = { width: '100%', minWidth: 0, minHeight: 34, boxSizing: 'border-box', background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 5px', fontSize: 10 };
const addButtonStyle = { minHeight: 34, border: 0, background: rq.red, color: '#fff', padding: '0 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', fontSize: 9, fontWeight: 950 };
const quickRowStyle = { minHeight: 39, background: rq.bg, border: `1px solid ${rq.line}`, padding: '4px 5px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 28px', alignItems: 'center', gap: 4 };
const removeStyle = { width: 27, height: 27, border: 0, background: rq.card, color: rq.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const searchStyle = { minHeight: 34, display: 'flex', alignItems: 'center', gap: 5, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.muted, padding: '0 7px' };
const searchInputStyle = { minWidth: 0, flex: 1, minHeight: 32, border: 0, outline: 0, background: 'transparent', color: rq.text, fontSize: 10 };
const footerStyle = { position: 'sticky', bottom: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 7, flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, padding: 7 };
const footerTextStyle = { color: rq.muted, fontSize: 8 };
const launchButtonStyle = { minHeight: 36, border: 0, background: rq.red, color: '#fff', padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontWeight: 950, fontSize: 10 };
const mutedStyle = { color: rq.muted, fontSize: 9, padding: 3 };
const emptyStyle = { minHeight: 130, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, textAlign: 'center', padding: 16, fontSize: 10 };
