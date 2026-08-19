import React, { useEffect, useMemo, useState } from 'react';
import { Check, Play, Plus, Search, Swords, Trash2, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dexMod(source = {}) {
  const dex = source?.stats?.dexterity ?? source?.dexterity ?? source?.abilities?.dexterity ?? 10;
  return Math.floor((numberOr(dex, 10) - 10) / 2);
}

function playerToCombatant(player) {
  const maxHp = numberOr(player.max_hp ?? player.maxHitPoints ?? player.max_hit_points ?? player.hp, 10);
  return {
    id: player.id || `player-${player.name || player.character_name}`,
    character_id: player.character_id || null,
    legacy_player_id: player.legacy_player_id || null,
    name: player.name || player.character_name || 'Player Character',
    type: 'player',
    hp: numberOr(player.hp ?? player.current_hp ?? player.current_hit_points, maxHp),
    maxHp,
    ac: numberOr(player.ac ?? player.armor_class, 10),
    initiativeMod: numberOr(player.initiativeMod, dexMod(player)),
    conditions: Array.isArray(player.conditions) ? player.conditions : [],
    source: player.source || 'legacy',
    tokenColor: '#4a7dff',
    tokenSize: 40,
  };
}

function npcToCombatant(npc) {
  const maxHp = numberOr(npc.hp ?? npc.max_hp ?? npc.hit_points, 10);
  return {
    id: npc.id || `npc-${npc.name}`,
    name: npc.name || 'NPC',
    type: 'npc',
    hp: maxHp,
    maxHp,
    ac: numberOr(npc.ac ?? npc.armor_class, 10),
    initiativeMod: numberOr(npc.initiativeMod, dexMod(npc)),
    conditions: [],
    description: npc.description || npc.notes || '',
    actions: npc.actions || npc.attacks || [],
    reactions: npc.reactions || [],
    bonus_actions: npc.bonus_actions || [],
    tokenColor: '#d00000',
    tokenSize: 40,
  };
}

function combatantKey(combatant, index = 0) {
  return String(combatant?.id || `${combatant?.type || 'combatant'}:${combatant?.name || 'unknown'}:${index}`);
}

function sameCombatant(a, b) {
  if (a?.id && b?.id && a.id === b.id) return true;
  return Boolean(a?.name && b?.name && String(a.name).toLowerCase() === String(b.name).toLowerCase() && (a.type || '') === (b.type || ''));
}

function appendUnique(list, combatant) {
  return list.some(existing => sameCombatant(existing, combatant)) ? list : [...list, combatant];
}

const EMPTY_QUICK = { name: '', quantity: 1, hp: 10, ac: 10, initiative: 0 };

export default function LiveEncounterLauncher({ campaignId }) {
  const navigate = useNavigate();
  const [campaignName, setCampaignName] = useState('Campaign');
  const [scenarios, setScenarios] = useState([]);
  const [players, setPlayers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [companionIds, setCompanionIds] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [enabledBaseKeys, setEnabledBaseKeys] = useState([]);
  const [includedPlayerIds, setIncludedPlayerIds] = useState([]);
  const [includedCompanionIds, setIncludedCompanionIds] = useState([]);
  const [extraNpcIds, setExtraNpcIds] = useState([]);
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
        const loadedScenarios = Array.isArray(scenarioRes.data) ? scenarioRes.data : [];
        const loadedPlayers = Array.isArray(playerRes.data) ? playerRes.data : [];
        setCampaignName(campaignRes.data?.name || 'Campaign');
        setScenarios(loadedScenarios);
        setPlayers(loadedPlayers);
        setNpcs(Array.isArray(npcRes.data) ? npcRes.data : []);
        setCompanionIds(Array.isArray(stateRes.data?.companion_npc_ids) ? stateRes.data.companion_npc_ids : []);
        setIncludedPlayerIds(loadedPlayers.map(player => player.id).filter(Boolean));

        let requested = '';
        try {
          requested = localStorage.getItem(`gm.questEncounter.${campaignId}`) || '';
          if (requested) localStorage.removeItem(`gm.questEncounter.${campaignId}`);
        } catch { /* ignore */ }
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
  const baseCombatants = useMemo(() => Array.isArray(selected?.combatants) ? selected.combatants : [], [selected]);

  useEffect(() => {
    setEnabledBaseKeys(baseCombatants.map((item, index) => combatantKey(item, index)));
    setIncludedCompanionIds([]);
    setExtraNpcIds([]);
    setNpcSearch('');
    setQuickCombatants([]);
    setQuickDraft(EMPTY_QUICK);
  }, [selectedId, baseCombatants]);

  const companionNpcs = useMemo(() => companionIds.map(id => npcs.find(npc => npc.id === id)).filter(Boolean), [companionIds, npcs]);
  const otherNpcs = useMemo(() => {
    const term = npcSearch.trim().toLowerCase();
    return npcs.filter(npc => !companionIds.includes(npc.id) && (!term || [npc.name, npc.role, npc.location].some(value => String(value || '').toLowerCase().includes(term))));
  }, [companionIds, npcSearch, npcs]);

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
      type: 'enemy',
      hp,
      maxHp: hp,
      ac,
      initiativeMod,
      conditions: [],
      tokenColor: '#d00000',
      tokenSize: 40,
      temporary: true,
    }));
    setQuickCombatants(prev => [...prev, ...created]);
    setQuickDraft(prev => ({ ...EMPTY_QUICK, hp: prev.hp, ac: prev.ac, initiative: prev.initiative }));
    toast.success(`${quantity} temporary combatant${quantity === 1 ? '' : 's'} added`);
  };

  const launch = () => {
    if (!selected) return;
    let combatants = [];
    baseCombatants.forEach((combatant, index) => {
      if (enabledBaseKeys.includes(combatantKey(combatant, index))) combatants = appendUnique(combatants, combatant);
    });
    players.filter(player => includedPlayerIds.includes(player.id)).forEach(player => { combatants = appendUnique(combatants, playerToCombatant(player)); });
    companionNpcs.filter(npc => includedCompanionIds.includes(npc.id)).forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    npcs.filter(npc => extraNpcIds.includes(npc.id)).forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    quickCombatants.forEach(combatant => { combatants = appendUnique(combatants, combatant); });

    try { localStorage.setItem(`gm.lastEncounter.${campaignId}`, selected.id || ''); } catch { /* ignore */ }
    navigate(`/combat/${campaignId}`, {
      state: {
        scenario: { ...selected, combatants, name: selected.name || 'Live Encounter' },
        campaignId,
        campaignName,
        source: 'live-play',
      },
    });
  };

  if (loading) return <div style={emptyStyle}>Loading encounters…</div>;
  if (!scenarios.length) return <div style={emptyStyle}>No saved encounters yet. Build one in Campaign Prep, then it will appear here.</div>;

  return (
    <div data-testid="live-encounter-launcher" style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Live Play</p>
          <h2 style={titleStyle}><Swords size={20} /> Encounters</h2>
        </div>
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)} style={selectStyle}>
          {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name || 'Untitled Encounter'}</option>)}
        </select>
      </header>

      {selected?.description && <div style={descriptionStyle}>{selected.description}</div>}

      <ParticipantSection title="Prepared Participants" count={baseCombatants.length}>
        {baseCombatants.length === 0 && <span style={mutedStyle}>No saved participants. Add temporary combatants below or pull in a saved NPC.</span>}
        {baseCombatants.map((combatant, index) => {
          const key = combatantKey(combatant, index);
          const checked = enabledBaseKeys.includes(key);
          return <ToggleRow key={key} checked={checked} title={combatant.name || 'Combatant'} meta={combatant.type || 'Prepared'} onClick={() => toggle(key, enabledBaseKeys, setEnabledBaseKeys)} />;
        })}
      </ParticipantSection>

      <details key={`quick-${selectedId}`} open={baseCombatants.length === 0 ? true : undefined} style={detailsStyle}>
        <summary style={summaryStyle}><Plus size={14} /> Quick Combatant <span style={summaryCountStyle}>{quickCombatants.length}</span></summary>
        <div style={detailsBodyStyle}>
          <div style={quickFormStyle}>
            <input value={quickDraft.name} onChange={event => setQuickDraft(prev => ({ ...prev, name: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addQuickCombatants(); } }} placeholder="Name" style={quickInputStyle} />
            <label style={numberFieldStyle}><span>Qty</span><input type="number" min="1" max="20" value={quickDraft.quantity} onChange={event => setQuickDraft(prev => ({ ...prev, quantity: event.target.value }))} style={quickNumberStyle} /></label>
            <label style={numberFieldStyle}><span>HP</span><input type="number" min="1" value={quickDraft.hp} onChange={event => setQuickDraft(prev => ({ ...prev, hp: event.target.value }))} style={quickNumberStyle} /></label>
            <label style={numberFieldStyle}><span>AC</span><input type="number" min="1" value={quickDraft.ac} onChange={event => setQuickDraft(prev => ({ ...prev, ac: event.target.value }))} style={quickNumberStyle} /></label>
            <label style={numberFieldStyle}><span>Init</span><input type="number" value={quickDraft.initiative} onChange={event => setQuickDraft(prev => ({ ...prev, initiative: event.target.value }))} style={quickNumberStyle} /></label>
            <button type="button" onClick={addQuickCombatants} disabled={!String(quickDraft.name || '').trim()} style={quickAddStyle}><Plus size={14} /> Add</button>
          </div>
          {quickCombatants.length > 0 && (
            <div style={resultsStyle}>
              {quickCombatants.map(item => (
                <div key={item.id} style={quickRowStyle}>
                  <span style={{ minWidth: 0 }}><strong style={rowTitleStyle}>{item.name}</strong><span style={rowMetaStyle}>HP {item.maxHp} · AC {item.ac} · Init {item.initiativeMod >= 0 ? '+' : ''}{item.initiativeMod}</span></span>
                  <button type="button" onClick={() => setQuickCombatants(prev => prev.filter(combatant => combatant.id !== item.id))} style={removeQuickStyle} title="Remove"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
          <span style={mutedStyle}>Temporary only — these combatants are added to this run and do not rewrite the saved encounter.</span>
        </div>
      </details>

      <ParticipantSection title="Party" count={players.length}>
        {players.length === 0 && <span style={mutedStyle}>No linked player characters yet.</span>}
        {players.map(player => (
          <ToggleRow
            key={player.id}
            checked={includedPlayerIds.includes(player.id)}
            title={player.name || player.character_name || 'Player'}
            meta={`${player.character_class || 'Player'}${player.level ? ` · L${player.level}` : ''} · HP ${player.hp ?? '?'} / ${player.max_hp ?? '?'} · AC ${player.ac ?? '?'}`}
            onClick={() => toggle(player.id, includedPlayerIds, setIncludedPlayerIds)}
          />
        ))}
      </ParticipantSection>

      <ParticipantSection title="Travelling NPC Suggestions" count={companionNpcs.length} accent>
        {companionNpcs.length === 0 && <span style={mutedStyle}>No NPCs are currently marked as travelling with the party.</span>}
        {companionNpcs.map(npc => <ToggleRow key={npc.id} checked={includedCompanionIds.includes(npc.id)} title={npc.name} meta={`${npc.role || npc.occupation || 'NPC'}${npc.location ? ` · ${npc.location}` : ''}`} onClick={() => toggle(npc.id, includedCompanionIds, setIncludedCompanionIds)} suggested />)}
      </ParticipantSection>

      <details style={detailsStyle}>
        <summary style={summaryStyle}><UserPlus size={14} /> Add another NPC</summary>
        <div style={detailsBodyStyle}>
          <label style={searchStyle}><Search size={14} /><input value={npcSearch} onChange={event => setNpcSearch(event.target.value)} placeholder="Search saved NPCs…" style={searchInputStyle} /></label>
          <div style={resultsStyle}>
            {otherNpcs.slice(0, 12).map(npc => <ToggleRow key={npc.id} checked={extraNpcIds.includes(npc.id)} title={npc.name} meta={`${npc.role || npc.occupation || 'NPC'}${npc.location ? ` · ${npc.location}` : ''}`} onClick={() => toggle(npc.id, extraNpcIds, setExtraNpcIds)} />)}
          </div>
        </div>
      </details>

      <footer style={footerStyle}>
        <span style={footerTextStyle}>Changes here affect this fight only. The saved encounter stays untouched.</span>
        <button type="button" onClick={launch} style={launchButtonStyle}><Play size={15} /> Start Encounter</button>
      </footer>
    </div>
  );
}

function ParticipantSection({ title, count, children, accent = false }) {
  return <section style={{ ...sectionStyle, borderLeft: accent ? `5px solid ${rq.red}` : `1px solid ${rq.line}` }}><div style={sectionHeaderStyle}><strong>{title}</strong><span>{count}</span></div><div style={rowsStyle}>{children}</div></section>;
}

function ToggleRow({ checked, title, meta, onClick, suggested = false }) {
  return (
    <button type="button" onClick={onClick} style={rowStyle(checked)}>
      <span style={checkStyle(checked)}>{checked ? <Check size={12} /> : <X size={11} />}</span>
      <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}><strong style={rowTitleStyle}>{title}</strong><span style={rowMetaStyle}>{meta}{suggested ? ' · Suggested' : ''}</span></span>
    </button>
  );
}

const shellStyle = { display: 'grid', gap: 8, color: rq.text, fontFamily: fontStack };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${rq.red}`, padding: 10 };
const eyebrowStyle = { margin: 0, color: rq.muted, fontSize: 9, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: '3px 0 0', color: rq.text, fontSize: 20, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 7 };
const selectStyle = { minHeight: 36, minWidth: 210, maxWidth: '100%', background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 9px', fontFamily: fontStack };
const descriptionStyle = { background: rq.bg, border: `1px solid ${rq.line}`, color: rq.soft, padding: 8, fontSize: 11, lineHeight: 1.4 };
const sectionStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 8, display: 'grid', gap: 6 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, color: rq.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' };
const rowsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 4 };
const rowStyle = checked => ({ minHeight: 42, background: checked ? rq.card : rq.bg, border: `1px solid ${checked ? rq.red : rq.line}`, color: rq.text, padding: '5px 7px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: fontStack });
const checkStyle = checked => ({ width: 22, height: 22, display: 'grid', placeItems: 'center', flex: '0 0 22px', background: checked ? rq.red : rq.card, color: checked ? '#fff' : rq.muted, border: `1px solid ${checked ? rq.red : rq.line}` });
const rowTitleStyle = { display: 'block', color: rq.text, fontSize: 11, fontWeight: 950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const rowMetaStyle = { display: 'block', color: rq.muted, fontSize: 9, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const detailsStyle = { background: rq.panel, border: `1px solid ${rq.line}` };
const summaryStyle = { minHeight: 38, padding: '0 9px', display: 'flex', alignItems: 'center', gap: 6, color: rq.soft, cursor: 'pointer', fontSize: 11, fontWeight: 900, listStyle: 'none' };
const summaryCountStyle = { marginLeft: 'auto', color: rq.muted, fontSize: 9 };
const detailsBodyStyle = { borderTop: `1px solid ${rq.line}`, padding: 8, display: 'grid', gap: 6 };
const searchStyle = { minHeight: 34, display: 'flex', alignItems: 'center', gap: 6, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.muted, padding: '0 7px' };
const searchInputStyle = { minWidth: 0, flex: 1, minHeight: 32, border: 0, outline: 0, background: 'transparent', color: rq.text, fontSize: 11 };
const resultsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 4 };
const quickFormStyle = { display: 'grid', gridTemplateColumns: 'minmax(130px, 2fr) repeat(4, minmax(60px, 0.55fr)) auto', gap: 5, alignItems: 'end' };
const quickInputStyle = { minHeight: 34, minWidth: 0, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px', fontSize: 11 };
const numberFieldStyle = { display: 'grid', gap: 2, color: rq.muted, fontSize: 8, fontWeight: 900, textTransform: 'uppercase' };
const quickNumberStyle = { width: '100%', minWidth: 0, minHeight: 34, boxSizing: 'border-box', background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 5px', fontSize: 11 };
const quickAddStyle = { minHeight: 34, border: 0, background: rq.red, color: '#fff', padding: '0 9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 10, fontWeight: 950 };
const quickRowStyle = { minHeight: 40, background: rq.bg, border: `1px solid ${rq.line}`, padding: '5px 6px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 30px', alignItems: 'center', gap: 5 };
const removeQuickStyle = { width: 28, height: 28, border: 0, background: rq.card, color: rq.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const footerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, padding: 8 };
const footerTextStyle = { color: rq.muted, fontSize: 10 };
const launchButtonStyle = { minHeight: 36, border: 0, background: rq.red, color: '#fff', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 950 };
const mutedStyle = { color: rq.muted, fontSize: 10, padding: 4 };
const emptyStyle = { minHeight: 170, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, textAlign: 'center', padding: 20 };
