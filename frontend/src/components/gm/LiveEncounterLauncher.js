import React, { useEffect, useMemo, useState } from 'react';
import { Check, Play, Plus, Search, Swords, Trash2, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveEncounterSelection } from './encounterSelection';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { loadEncounterReviewSections } from '@/data/livePlayLoaders';
import LiveDataWarning from '@/components/gm/LiveDataWarning';

const rq = {
  bg: 'var(--rq-bg-main)', panel: 'var(--rq-bg-panel)', card: 'var(--rq-card)',
  pink: 'var(--rq-accent-primary)', blue: 'var(--rq-secondary)', red: 'var(--rq-accent-primary)',
  text: 'var(--rq-text-primary)', soft: 'var(--rq-text-primary)', muted: 'var(--rq-text-primary)', line: 'var(--rq-border-default)',
};
const EMPTY_QUICK = { name: '', quantity: 1, hp: 10, ac: 10, initiative: 0 };
const safeArray = value => Array.isArray(value) ? value : [];

export function readQueuedNpcIds(storage, campaignId, loadedNpcs = []) {
  try {
    const rawQueue = JSON.parse(storage.getItem(`gm.liveEncounterNpcQueue.${campaignId}`) || '[]');
    return safeArray(rawQueue).filter(id => loadedNpcs.some(npc => npc.id === id));
  } catch {
    return [];
  }
}

export function clearQueuedNpcIds(storage, campaignId) {
  try {
    storage.removeItem(`gm.liveEncounterNpcQueue.${campaignId}`);
  } catch { /* local handoff cleanup is best effort */ }
}

export function persistQueuedNpcIds(storage, campaignId, npcIds) {
  try {
    storage.setItem(`gm.liveEncounterNpcQueue.${campaignId}`, JSON.stringify(safeArray(npcIds)));
    return true;
  } catch {
    return false;
  }
}

export function createImpromptuEncounter(combatants, timestamp = Date.now()) {
  return {
    id: `impromptu-${timestamp}`,
    name: 'Impromptu Battle',
    combatants: safeArray(combatants),
    temporary: true,
  };
}

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
    tokenColor: '#D6A84F', tokenSize: 40,
  };
}

function keyFor(item, index = 0) {
  return String(item?.id || `${item?.type || 'combatant'}:${item?.name || 'unknown'}:${index}`);
}

/** Every stable reference a combatant carries to the thing it represents. */
function combatantReferences(value) {
  const references = new Set();
  ['character_id', 'legacy_player_id', 'npc_id', 'id'].forEach(field => {
    const reference = value?.[field];
    if (reference) references.add(String(reference));
  });
  return references;
}

/**
 * Whether two entries are the same thing twice, rather than two things.
 *
 * Matching on name and type merged creatures that merely share a name, and
 * did so even when both carried distinct ids: the id branch only returned
 * true on a match and then fell through to the name comparison. A GM who put
 * six town guards in an encounter launched with one, silently -- and two
 * player characters who happen to share a name lost one of them.
 *
 * What has to keep merging is several references to ONE thing: a player
 * reached through the prepared list and again through the party roster, or
 * the same saved NPC added twice. Those always share at least one reference,
 * so comparing the reference sets covers it without guessing from names.
 *
 * With no reference on either side there is nothing to match on, and two
 * creatures quick-added from the bestiary are two creatures. Their enabled
 * state stays addressable because keyFor falls back to type:name:index.
 */
function sameCombatant(a, b) {
  const left = combatantReferences(a);
  if (left.size === 0) return false;
  const right = combatantReferences(b);
  if (right.size === 0) return false;
  for (const reference of left) {
    if (right.has(reference)) return true;
  }
  return false;
}

function appendUnique(list, combatant) {
  return list.some(existing => sameCombatant(existing, combatant)) ? list : [...list, combatant];
}

// A prepared encounter can include saved player tokens, but their live HP,
// conditions and death saves must come from the canonical party at launch.
// The party toggles also apply to pre-saved characters; unchecking a player
// must not leave a second copy of that character in the prepared list.
export function combinePreparedEncounterParty(prepared = [], players = [], enabledBaseKeys = [], includedPlayerIds = []) {
  let combatants = [];
  const liveById = new Map();
  const liveByName = new Map();
  safeArray(players).forEach(player => {
    [player.id, player.character_id, player.legacy_player_id].filter(Boolean)
      .forEach(id => liveById.set(String(id), player));
    if (player.name) liveByName.set(String(player.name).trim().toLowerCase(), player);
  });

  safeArray(prepared).forEach((combatant, index) => {
    if (!enabledBaseKeys.includes(keyFor(combatant, index))) return;
    if (combatant?.type === 'player') {
      const live = liveById.get(String(combatant.character_id || combatant.id || ''))
        || liveById.get(String(combatant.id || ''))
        || liveByName.get(String(combatant.name || '').trim().toLowerCase());
      if (live) {
        if (includedPlayerIds.includes(live.id)) {
          combatants = appendUnique(combatants, playerToCombatant(live));
        }
        return;
      }
    }
    combatants = appendUnique(combatants, combatant);
  });

  safeArray(players).filter(player => includedPlayerIds.includes(player.id))
    .forEach(player => { combatants = appendUnique(combatants, playerToCombatant(player)); });

  return combatants;
}

/**
 * Kept as a named export because callers and tests import it. The policy now
 * lives in encounterSelection.js so Run ranks encounters the same way, and a
 * remembered encounter no longer outranks the next prepared one: it is
 * reached only through Reopen Last Encounter.
 */
export function preferredPreparedEncounterId(scenarios = [], requestedId = '', previousId = '') {
  // The third argument was always "what we had before", meaning either the
  // GM's live selection or the remembered id. It is treated as remembered,
  // which is the stricter of the two: an archived encounter never returns by
  // itself.
  return resolveEncounterSelection({
    scenarios,
    requestedId,
    rememberedId: previousId,
    allowRemembered: true,
  }).id;
}

function sortEncounterOptions(scenarios = []) {
  const rank = item => item.live_ready && !item.played ? 0 : item.legacy ? 2 : 1;
  return [...safeArray(scenarios)].sort((a, b) =>
    rank(a) - rank(b)
      || (a.planned_encounter_order ?? Infinity) - (b.planned_encounter_order ?? Infinity));
}

export default function LiveEncounterLauncher({
  campaignId,
  requestedEncounterId = '',
  reopenLastEncounter = false,
  encounterRequestNonce = 0,
}) {
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
  const [loadErrors, setLoadErrors] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { sections, errors } = await loadEncounterReviewSections(apiClient, campaignId);
        const loadedScenarios = sections.scenarios.ok ? safeArray(sections.scenarios.data) : null;
        const loadedPlayers = sections.players.ok ? safeArray(sections.players.data) : null;
        const loadedNpcs = sections.npcs.ok ? safeArray(sections.npcs.data) : null;

        if (sections.campaign.ok) setCampaignName(sections.campaign.data?.name || 'Campaign');
        if (loadedScenarios) setScenarios(sortEncounterOptions(loadedScenarios));
        if (loadedPlayers) {
          setPlayers(loadedPlayers);
          setIncludedPlayerIds(loadedPlayers.map(player => player.id).filter(Boolean));
        }
        if (loadedNpcs) setNpcs(loadedNpcs);
        if (sections.liveState.ok) setTravellingIds(safeArray(sections.liveState.data?.companion_npc_ids));

        if (loadedNpcs) {
          const queued = readQueuedNpcIds(localStorage, campaignId, loadedNpcs);
          setQueuedNpcIds(queued);
        }

        if (loadedScenarios) {
          // A quest or note hands an encounter over through this key; it is
          // read once and cleared. The prop is the same handoff from Run,
          // made explicit rather than routed through storage.
          let queuedRequest = '';
          let remembered = '';
          try {
            queuedRequest = localStorage.getItem(`gm.questEncounter.${campaignId}`) || '';
            remembered = localStorage.getItem(`gm.lastEncounter.${campaignId}`) || '';
            localStorage.removeItem(`gm.questEncounter.${campaignId}`);
          } catch { /* ignore */ }

          setSelectedId(previous => {
            const outcome = resolveEncounterSelection({
              scenarios: loadedScenarios,
              requestedId: requestedEncounterId || queuedRequest,
              gmSelectedId: previous,
              rememberedId: remembered,
              allowRemembered: reopenLastEncounter,
            });
            if (outcome.missingRequest) {
              toast.warning('That encounter is no longer in this campaign. Choose another below.');
            }
            return outcome.id;
          });
        }

        setLoadErrors(errors);
        if (errors.length) toast.warning('Some Encounter Review data could not be refreshed. Existing data has been kept where available.');
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Could not load saved encounters');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId, reloadKey, requestedEncounterId, reopenLastEncounter, encounterRequestNonce]);

  const selected = useMemo(() => scenarios.find(item => item.id === selectedId) || null, [scenarios, selectedId]);
  const baseCombatants = useMemo(() => safeArray(selected?.combatants), [selected]);
  const preparedOpponents = useMemo(() => baseCombatants.map((combatant, index) => ({ combatant, index })).filter(item => item.combatant.type !== 'player'), [baseCombatants]);
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

  const removeQueuedNpc = npcId => {
    const nextQueuedIds = queuedNpcIds.filter(id => id !== npcId);
    if (!persistQueuedNpcIds(localStorage, campaignId, nextQueuedIds)) {
      toast.error('Could not update the queued NPC list. Nothing was removed.');
      return;
    }
    setQueuedNpcIds(nextQueuedIds);
  };

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
      type: 'enemy', hp, maxHp: hp, ac, initiativeMod, conditions: [], tokenColor: '#D6A84F', tokenSize: 40, temporary: true,
    }));
    setQuickCombatants(prev => [...prev, ...created]);
    setQuickDraft(prev => ({ ...EMPTY_QUICK, hp: prev.hp, ac: prev.ac, initiative: prev.initiative }));
    toast.success(`${quantity} temporary combatant${quantity === 1 ? '' : 's'} added`);
  };

  const launch = () => {
    const participantLoadFailed = loadErrors.some(item => ['players', 'npcs', 'liveState'].includes(item.key));
    if (participantLoadFailed) {
      toast.error('Participant data is incomplete. Retry Encounter Review before starting combat so nobody is accidentally omitted.');
      return;
    }

    let combatants = combinePreparedEncounterParty(baseCombatants, players, enabledBaseKeys, includedPlayerIds);
    companionNpcs.filter(npc => includedCompanionIds.includes(npc.id)).forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    queuedNpcs.forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    npcs.filter(npc => extraNpcIds.includes(npc.id)).forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    quickCombatants.forEach(combatant => { combatants = appendUnique(combatants, combatant); });

    if (!combatants.length) {
      toast.error('Choose a player, NPC or creature before starting combat.');
      return;
    }

    if (selected) {
      try { localStorage.setItem(`gm.lastEncounter.${campaignId}`, selected.id || ''); } catch { /* ignore */ }
    }
    clearQueuedNpcIds(localStorage, campaignId);
    navigate(`/combat/${campaignId}`, {
      state: {
        scenario: selected
          ? { ...selected, combatants, name: selected.name || 'Live Encounter' }
          : createImpromptuEncounter(combatants),
        campaignId,
        campaignName,
        source: 'live-play',
      },
    });
  };

  const retryLoad = () => setReloadKey(value => value + 1);
  const scenarioLoadFailed = loadErrors.some(item => item.key === 'scenarios');

  if (loading) return <div style={emptyStyle}>Loading encounters…</div>;
  if (!scenarios.length && scenarioLoadFailed) {
    return <div style={{ display: 'grid', gap: 7 }}><LiveDataWarning errors={loadErrors} onRetry={retryLoad} compact /><div style={emptyStyle}>Saved encounters could not be loaded. Retry instead of treating this as an empty campaign.</div></div>;
  }
  return (
    <div data-testid="live-encounter-launcher" style={shellStyle}>
      <header style={headerStyle}>
        <span style={{ minWidth: 0 }}><strong style={headerTitleStyle}><Swords size={17} /> Encounter Review</strong><span style={headerMetaStyle}>Choose who is in this fight, then start.</span></span>
        <select aria-label="Choose battle type" value={selectedId} onChange={event => setSelectedId(event.target.value)} style={selectStyle}>
          <option value="">Impromptu Battle — build as you go</option>
          {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name || 'Untitled Encounter'}</option>)}
        </select>
      </header>

      <LiveDataWarning errors={loadErrors} onRetry={retryLoad} compact />
      <footer style={footerStyle} data-testid="live-encounter-run-bar">
        <span style={footerTextStyle}>{selected ? `${preparedOpponents.length} prepared enemies/objects · ${includedPlayerIds.length} party selected` : 'Impromptu combat'} · Your saved encounter stays unchanged.</span>
        <button type="button" onClick={launch} style={launchButtonStyle}><Play size={17} /> {selected ? 'Start Prepared Encounter' : 'Start Impromptu Battle'}</button>
      </footer>
      {!selected && <div style={descriptionStyle}>No preparation needed. Add the party, a saved NPC, or a quick creature and start combat. You can recruit more enemies from the combat tracker at any time.</div>}
      {selected?.description && (
        <details style={detailsStyle}>
          <summary style={summaryStyle}>GM encounter notes & triggers</summary>
          <div style={descriptionStyle}>{selected.description}</div>
        </details>
      )}

      {queuedNpcs.length > 0 && (
        <ParticipantSection title="Added from NPCs" count={queuedNpcs.length} accent>
          {queuedNpcs.map(npc => <ToggleRow key={npc.id} checked title={npc.name} meta={`${npc.role || npc.occupation || 'NPC'} · queued`} onClick={() => removeQueuedNpc(npc.id)} />)}
        </ParticipantSection>
      )}

      <ParticipantSection title="Enemies & objects" count={preparedOpponents.length}>
        {preparedOpponents.length === 0 && <span style={mutedStyle}>No enemies saved — add combatants below.</span>}
        {preparedOpponents.map(({ combatant, index }) => {
          const key = keyFor(combatant, index);
          return <ToggleRow key={key} checked={enabledBaseKeys.includes(key)} title={combatant.name || 'Combatant'} meta={combatant.is_environment ? 'Environmental object' : (combatant.type || 'Enemy')} onClick={() => toggle(key, enabledBaseKeys, setEnabledBaseKeys)} />;
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


    </div>
  );
}

function ParticipantSection({ title, count, children, accent = false }) {
  return <section style={{ ...sectionStyle, borderLeft: accent ? `1px solid ${rq.pink}` : `1px solid ${rq.line}` }}><div style={sectionHeaderStyle}><strong>{title}</strong><span>{count}</span></div><div style={rowsStyle}>{children}</div></section>;
}

function ToggleRow({ checked, title, meta, onClick }) {
  return <button type="button" onClick={onClick} style={rowStyle(checked)}><span style={checkStyle(checked)}>{checked ? <Check size={11} /> : <X size={10} />}</span><span style={{ minWidth: 0, textAlign: 'left' }}><strong style={rowTitleStyle}>{title}</strong><span style={rowMetaStyle}>{meta}</span></span></button>;
}

function NumberField({ label, value, min, onChange }) {
  return <label style={numberFieldStyle}><span>{label}</span><input type="number" min={min} value={value} onChange={event => onChange(event.target.value)} style={numberInputStyle} /></label>;
}

const shellStyle = { display: 'grid', gap: 6, color: rq.text };
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `3px solid ${rq.pink}`, borderRadius: 10, padding: 12 };
const headerTitleStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: rq.text };
const headerMetaStyle = { display: 'block', color: rq.muted, fontSize: 12, marginTop: 3 };
const selectStyle = { minHeight: 44, flex: '1 1 240px', maxWidth: 480, minWidth: 0, background: rq.bg, border: `1px solid ${rq.line}`, borderRadius: 8, color: rq.text, padding: '0 10px', fontSize: 12 };
const descriptionStyle = { background: rq.bg, borderTop: `1px solid ${rq.line}`, color: rq.soft, padding: 12, fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' };
const sectionStyle = { background: rq.panel, border: `1px solid ${rq.line}`, borderRadius: 9, padding: 10, display: 'grid', gap: 9 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 8, color: rq.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' };
const rowsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 210px),1fr))', gap: 7 };
const rowStyle = checked => ({ minHeight: 46, background: checked ? rq.card : rq.bg, border: `1px solid ${checked ? rq.red : rq.line}`, borderRadius: 7, color: rq.text, padding: '7px 9px', display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', alignItems: 'center', gap: 8, cursor: 'pointer' });
const checkStyle = checked => ({ width: 21, height: 21, display: 'grid', placeItems: 'center', background: checked ? rq.red : rq.card, color: checked ? '#fff' : rq.muted, border: `1px solid ${checked ? rq.red : rq.line}` });
const rowTitleStyle = { display: 'block', color: rq.text, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const rowMetaStyle = { display: 'block', color: rq.muted, fontSize: 10, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const detailsStyle = { background: rq.panel, border: `1px solid ${rq.line}`, borderRadius: 8 };
const summaryStyle = { minHeight: 44, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, color: rq.soft, cursor: 'pointer', fontSize: 12, fontWeight: 800 };
const countStyle = { marginLeft: 'auto', color: rq.muted, fontSize: 8 };
const detailsBodyStyle = { borderTop: `1px solid ${rq.line}`, padding: 6, display: 'grid', gap: 5 };
const quickFormStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(70px,1fr))', gap: 4, alignItems: 'end' };
const inputStyle = { minHeight: 34, minWidth: 0, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px', fontSize: 10 };
const numberFieldStyle = { display: 'grid', gap: 2, color: rq.muted, fontSize: 7, fontWeight: 900, textTransform: 'uppercase' };
const numberInputStyle = { width: '100%', minWidth: 0, minHeight: 34, boxSizing: 'border-box', background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 5px', fontSize: 10 };
const addButtonStyle = { minHeight: 34, border: `1px solid ${rq.pink}`, background: rq.card, color: '#F7F1E7', padding: '0 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', fontSize: 9, fontWeight: 950 };
const quickRowStyle = { minHeight: 39, background: rq.bg, border: `1px solid ${rq.line}`, padding: '4px 5px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 28px', alignItems: 'center', gap: 4 };
const removeStyle = { width: 27, height: 27, border: 0, background: rq.card, color: rq.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const searchStyle = { minHeight: 34, display: 'flex', alignItems: 'center', gap: 5, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.muted, padding: '0 7px' };
const searchInputStyle = { minWidth: 0, flex: 1, minHeight: 32, border: 0, outline: 0, background: 'transparent', color: rq.text, fontSize: 10 };
const footerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, borderRadius: 9, padding: 10 };
const footerTextStyle = { color: rq.muted, fontSize: 11, lineHeight: 1.45 };
const launchButtonStyle = { minHeight: 46, border: '1px solid #b94648', background: 'var(--rq-guild-wine, #7e2d2d)', borderRadius: 8, color: '#fff', padding: '0 17px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', fontWeight: 850, fontSize: 12 };
const mutedStyle = { color: rq.muted, fontSize: 9, padding: 3 };
const emptyStyle = { minHeight: 130, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, textAlign: 'center', padding: 16, fontSize: 10 };