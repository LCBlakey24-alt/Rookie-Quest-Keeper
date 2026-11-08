import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Play, Plus, Search, Swords, Trash2, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveEncounterSelection } from './encounterSelection';
import { PARTY_UNAVAILABLE_MESSAGE, describeLaunchReadiness } from './encounterLaunchReadiness';
import {
  clearDraft,
  createEmptyDraft,
  draftHasUnsavedWork,
  draftMatches,
  draftStorageKey,
  enabledBaseKeysFrom,
  forgetDraftsInMemory,
  includedPlayerIdsFrom,
  purgeUnownedDrafts,
  readDraft,
  reconcileDraft,
  writeDraft,
} from './encounterReviewDraft';
import { currentCombatAccount } from '@/components/combat/combatCheckpoint';
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

/** The exact reviewed roster AND chosen map form one immutable battle handoff. */
export function encounterBattleScenario(selected, combatants, mapId = '', timestamp = Date.now()) {
  const base = selected
    ? { ...selected, name: selected.name || 'Live Encounter', combatants: safeArray(combatants) }
    : createImpromptuEncounter(combatants, timestamp);
  return { ...base, map_id: String(mapId || '') };
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
    const name = String(player.name || player.character_name || '').trim().toLowerCase();
    if (name) liveByName.set(name, [...(liveByName.get(name) || []), player]);
  });

  // A name is only evidence of identity when nothing better exists. A token
  // that names a character_id or legacy_player_id is THAT character; if they
  // are not in the party, an unrelated character who happens to share the
  // name must not be substituted -- their HP would be the one synced back.
  // And a name shared by two party members identifies neither.
  const liveByUniqueName = combatant => {
    if (combatant?.character_id || combatant?.legacy_player_id) return null;
    const matches = liveByName.get(String(combatant?.name || '').trim().toLowerCase()) || [];
    return matches.length === 1 ? matches[0] : null;
  };

  safeArray(prepared).forEach((combatant, index) => {
    if (!enabledBaseKeys.includes(keyFor(combatant, index))) return;
    if (combatant?.type === 'player') {
      const live = (combatant.character_id && liveById.get(String(combatant.character_id)))
        || (combatant.legacy_player_id && liveById.get(String(combatant.legacy_player_id)))
        || (combatant.id && liveById.get(String(combatant.id)))
        || liveByUniqueName(combatant);
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
  requestedEncounterCampaignId = campaignId,
  reopenLastEncounter = false,
  encounterRequestNonce = 0,
}) {
  const navigate = useNavigate();
  const [campaignName, setCampaignName] = useState('Campaign');
  const [scenarios, setScenarios] = useState([]);
  const [players, setPlayers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [battleMaps, setBattleMaps] = useState([]);
  const [battleMapsUnavailable, setBattleMapsUnavailable] = useState(false);
  const [travellingIds, setTravellingIds] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  // The signed-in account, from the auth token as combat checkpoints use it.
  // Re-read whenever auth changes so a sign-out or account switch in this tab
  // moves the review onto the new account's drafts immediately.
  const [accountId, setAccountId] = useState(() => currentCombatAccount());
  // Drafts touched while mounted, keyed exactly as storage keys them. The
  // current draft is looked up by account, campaign and encounter on every
  // render, so a draft can never be shown against another encounter, even
  // for the one render between choosing an encounter and an effect running.
  const [draftCache, setDraftCache] = useState({});
  const [draftPersistence, setDraftPersistence] = useState('saved');
  // Which sections have produced a successful response for this account and
  // campaign. Only those may prune the GM's selections.
  const [loadedSections, setLoadedSections] = useState({});
  // The LATEST party read, not "ever loaded": after a failed Retry the
  // previous list is stale and must not be launched as if it were current.
  // 'loading' | 'ok' | 'failed'
  const [partyStatus, setPartyStatus] = useState('loading');
  const launchingRef = useRef(false);
  const [queuedNpcIds, setQueuedNpcIds] = useState([]);
  const [npcSearch, setNpcSearch] = useState('');
  const [loadErrors, setLoadErrors] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const selectedIdRef = useRef('');
  const selectionCampaignRef = useRef(campaignId);
  const selectionAccountRef = useRef(accountId);
  const handledRequestRef = useRef('');
  const latestDraftRef = useRef(null);

  useEffect(() => {
    purgeUnownedDrafts();
    const refreshAccount = () => {
      const next = currentCombatAccount();
      if (!next) forgetDraftsInMemory();
      setAccountId(next);
    };
    window.addEventListener('rqk:auth-scope-changed', refreshAccount);
    window.addEventListener('storage', refreshAccount);
    return () => {
      window.removeEventListener('rqk:auth-scope-changed', refreshAccount);
      window.removeEventListener('storage', refreshAccount);
    };
  }, []);

  const selectEncounter = id => {
    const nextId = String(id || '');
    selectedIdRef.current = nextId;
    setSelectedId(nextId);
  };

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    if (selectionCampaignRef.current !== campaignId || selectionAccountRef.current !== accountId) {
      selectionCampaignRef.current = campaignId;
      selectionAccountRef.current = accountId;
      selectedIdRef.current = '';
      setSelectedId('');
      // Partial-load retention is useful during a retry in one campaign, but
      // it must never expose the previous campaign's or account's encounter
      // or roster. Drafts are not touched: they are keyed by account and
      // campaign, so the previous scope's drafts simply stop being looked up.
      // (Calling the draft setters here, as the first merge did, would have
      // written "everyone excluded" into the previous campaign's draft.)
      setCampaignName('Campaign');
      setScenarios([]);
      setPlayers([]);
      setNpcs([]);
      setTravellingIds([]);
      setQueuedNpcIds([]);
      setLoadedSections({});
      setPartyStatus('loading');
      setDraftCache({});
      setLoadErrors([]);
    }
    const load = async () => {
      setLoading(true);
      try {
        const { sections, errors } = await loadEncounterReviewSections(apiClient, campaignId);
        if (cancelled) return;
        const loadedScenarios = sections.scenarios.ok ? safeArray(sections.scenarios.data) : null;
        const loadedPlayers = sections.players.ok ? safeArray(sections.players.data) : null;
        const loadedNpcs = sections.npcs.ok ? safeArray(sections.npcs.data) : null;

        if (sections.campaign.ok) setCampaignName(sections.campaign.data?.name || 'Campaign');
        if (loadedScenarios) setScenarios(sortEncounterOptions(loadedScenarios));
        // Inclusion is derived from the draft now. Setting it here reset the
        // GM's exclusions on every refresh and on every Retry.
        if (loadedPlayers) setPlayers(loadedPlayers);
        // An empty party that loaded is not a party that could not be read.
        // The loader only reports failure when the live-party read AND the
        // legacy fallback both failed, so an empty array is never mistaken
        // for an outage.
        setPartyStatus(sections.players.ok ? 'ok' : 'failed');
        if (loadedNpcs) setNpcs(loadedNpcs);
        if (sections.liveState.ok) setTravellingIds(safeArray(sections.liveState.data?.companion_npc_ids));
        // A failure leaves the flag as it was: data kept from an earlier
        // successful load is still that load's authoritative answer.
        setLoadedSections(previous => ({
          ...previous,
          ...(loadedScenarios ? { scenarios: true } : {}),
          ...(loadedPlayers ? { players: true } : {}),
          ...(loadedNpcs ? { npcs: true } : {}),
          ...(sections.liveState.ok ? { liveState: true } : {}),
        }));

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

          const requestKey = `${campaignId}:${encounterRequestNonce}`;
          const propRequestIsForCampaign = requestedEncounterCampaignId === campaignId;
          const hasNewPropRequest = propRequestIsForCampaign
            && handledRequestRef.current !== requestKey
            && Boolean(requestedEncounterId || reopenLastEncounter);
          const explicitRequest = hasNewPropRequest
            ? (reopenLastEncounter ? remembered : requestedEncounterId)
            : queuedRequest;
          const outcome = resolveEncounterSelection({
            scenarios: loadedScenarios,
            requestedId: explicitRequest,
            gmSelectedId: selectedIdRef.current,
            rememberedId: remembered,
            allowRemembered: false,
          });
          if (hasNewPropRequest) handledRequestRef.current = requestKey;
          selectEncounter(outcome.id);
          if (outcome.missingRequest) {
            toast.warning('That encounter is no longer in this campaign. Choose another below.');
          }
        }

        setLoadErrors(errors);
        if (errors.length) toast.warning('Some Encounter Review data could not be refreshed. Existing data has been kept where available.');
      } catch (error) {
        if (!cancelled) toast.error(error?.response?.data?.detail || 'Could not load saved encounters');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [campaignId, accountId, reloadKey, requestedEncounterId, requestedEncounterCampaignId, reopenLastEncounter, encounterRequestNonce]);

  // Maps are optional; an API outage must never prevent a known roster from
  // launching. The combat page can re-fetch maps if this review cannot.
  useEffect(() => {
    let cancelled = false;
    setBattleMaps([]);
    setBattleMapsUnavailable(false);
    if (!campaignId || !accountId) return undefined;
    apiClient.get(`/campaigns/${campaignId}/maps`)
      .then(response => {
        if (!cancelled) setBattleMaps(safeArray(response.data));
      })
      .catch(() => {
        if (!cancelled) setBattleMapsUnavailable(true);
      });
    return () => { cancelled = true; };
  }, [campaignId, accountId, reloadKey]);

  const selected = useMemo(() => scenarios.find(item => item.id === selectedId) || null, [scenarios, selectedId]);
  const baseCombatants = useMemo(() => safeArray(selected?.combatants), [selected]);
  const preparedOpponents = useMemo(() => baseCombatants.map((combatant, index) => ({ combatant, index })).filter(item => item.combatant.type !== 'player'), [baseCombatants]);
  const companionNpcs = useMemo(() => travellingIds.map(id => npcs.find(npc => npc.id === id)).filter(Boolean), [npcs, travellingIds]);
  const queuedNpcs = useMemo(() => queuedNpcIds.map(id => npcs.find(npc => npc.id === id)).filter(Boolean), [npcs, queuedNpcIds]);

  const baseKeys = useMemo(
    () => baseCombatants.map((item, index) => keyFor(item, index)),
    [baseCombatants],
  );
  const playerIds = useMemo(() => players.map(player => player.id).filter(Boolean), [players]);
  const companionIdList = useMemo(() => companionNpcs.map(npc => npc.id).filter(Boolean), [companionNpcs]);
  const npcIdList = useMemo(() => npcs.map(npc => npc.id).filter(Boolean), [npcs]);

  // The draft for exactly this account, campaign and encounter. Nothing else
  // is ever in scope: switching encounter changes the key, and so the draft,
  // in the same render.
  const draftKey = draftStorageKey(accountId, campaignId, selectedId);
  const storedDraft = useMemo(
    () => draftCache[draftKey]
      || readDraft(campaignId, selectedId, { accountId })
      || createEmptyDraft(campaignId, selectedId, accountId),
    [draftCache, draftKey, campaignId, selectedId, accountId],
  );

  useEffect(() => { setNpcSearch(''); }, [campaignId, selectedId]);

  // Refreshed data is folded in for display and launch, never written back on
  // its own. A list is passed only when it came from a successful response
  // for this scope; otherwise null tells the reconciler to keep everything.
  const availability = useMemo(() => ({
    baseKeys: loadedSections.scenarios && (!selectedId || selected) ? baseKeys : null,
    playerIds: loadedSections.players ? playerIds : null,
    companionIds: loadedSections.npcs && loadedSections.liveState ? companionIdList : null,
    npcIds: loadedSections.npcs ? npcIdList : null,
  }), [loadedSections, selectedId, selected, baseKeys, playerIds, companionIdList, npcIdList]);
  const draft = useMemo(() => reconcileDraft(storedDraft, availability), [storedDraft, availability]);
  latestDraftRef.current = { key: draftKey, draft };

  /**
   * Apply one GM change to the draft on screen and persist it.
   *
   * The write is checked against the account signed in at the moment of the
   * write, not the one this render saw, so a change made in a tab that has
   * just switched accounts cannot land in the new account's scope (or the
   * old one's under the new one's name).
   */
  const commitDraft = producer => {
    const latest = latestDraftRef.current;
    const base = latest && latest.key === draftKey ? latest.draft : draft;
    const next = producer(base);
    if (!draftMatches(next, { accountId, campaignId, encounterId: selectedId })) return;
    const liveAccount = currentCombatAccount();
    if (liveAccount !== accountId) {
      // The tab changed account under us. Drop the change and move scope.
      setAccountId(liveAccount);
      return;
    }
    latestDraftRef.current = { key: draftKey, draft: next };
    setDraftCache(previous => ({ ...previous, [draftKey]: next }));
    // Signed out, the draft lives in this screen only; there is nobody to
    // persist it for.
    if (!accountId) return;
    const outcome = writeDraft(next, { accountId });
    setDraftPersistence(outcome === 'saved' ? 'saved' : 'memory');
  };

  const enabledBaseKeys = useMemo(() => enabledBaseKeysFrom(draft, baseKeys), [draft, baseKeys]);
  const includedPlayerIds = useMemo(() => includedPlayerIdsFrom(draft, playerIds), [draft, playerIds]);
  const includedCompanionIds = draft.includedCompanionIds;
  const extraNpcIds = draft.extraNpcIds;
  const quickCombatants = draft.quickCombatants;
  const quickDraft = draft.quickDraft;
  const battleMapId = String(draft.battleMapId === null || draft.battleMapId === undefined
    ? (selected?.map_id || selected?.mapId || '')
    : draft.battleMapId);
  const battleMapMissing = Boolean(battleMapId && !battleMapsUnavailable
    && battleMaps.length > 0 && !battleMaps.some(map => String(map.id) === battleMapId));

  // Setters keeping the shape the rest of the component already uses, so the
  // toggles and the quick-creature form are unchanged.
  const setEnabledBaseKeys = next => commitDraft(previous => {
    const chosen = new Set((Array.isArray(next) ? next : []).map(String));
    return { ...previous, disabledBaseKeys: baseKeys.filter(key => !chosen.has(key)) };
  });
  const setIncludedPlayerIds = next => commitDraft(previous => {
    const chosen = new Set((Array.isArray(next) ? next : []).map(String));
    // Keep exclusions of players not currently listed (for instance while
    // the party failed to refresh); only the visible ones are being decided.
    const unseen = (previous.excludedPlayerIds || []).filter(id => !playerIds.includes(id));
    return { ...previous, excludedPlayerIds: [...unseen, ...playerIds.filter(id => !chosen.has(id))] };
  });
  const setIncludedCompanionIds = next => commitDraft(previous => ({ ...previous, includedCompanionIds: next }));
  const setExtraNpcIds = next => commitDraft(previous => ({ ...previous, extraNpcIds: next }));
  const setQuickCombatants = next => commitDraft(previous => ({
    ...previous,
    quickCombatants: typeof next === 'function' ? next(previous.quickCombatants) : next,
  }));
  const setQuickDraft = next => commitDraft(previous => ({
    ...previous,
    quickDraft: typeof next === 'function' ? next(previous.quickDraft) : next,
  }));
  const setBattleMapId = id => commitDraft(previous => ({ ...previous, battleMapId: String(id || '') }));

  const discardDraft = () => {
    clearDraft(campaignId, selectedId, { accountId });
    const empty = createEmptyDraft(campaignId, selectedId, accountId);
    latestDraftRef.current = { key: draftKey, draft: empty };
    setDraftCache(previous => ({ ...previous, [draftKey]: empty }));
  };

  const resetReview = () => {
    if (draftHasUnsavedWork(draft)
      && !window.confirm('Discard your changes to this encounter review? The saved encounter itself is not changed.')) {
      return;
    }
    discardDraft();
    setNpcSearch('');
    toast.info('Encounter review reset to the saved encounter.');
  };

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
    commitDraft(previous => ({
      ...previous,
      quickCombatants: [...safeArray(previous.quickCombatants), ...created],
      quickDraft: { ...EMPTY_QUICK, hp: previous.quickDraft.hp, ac: previous.quickDraft.ac, initiative: previous.quickDraft.initiative },
    }));
    toast.success(`${quantity} temporary combatant${quantity === 1 ? '' : 's'} added`);
  };

  // The exact list that will be handed to combat. Built once so the counts
  // the GM reads are the roster that launches, rather than a tally of what
  // happens to be available -- the run bar used to report every prepared
  // enemy as though all of them were selected.
  const partyAvailable = partyStatus === 'ok';
  const launchRoster = useMemo(() => {
    let combatants = combinePreparedEncounterParty(baseCombatants, players, enabledBaseKeys, includedPlayerIds);
    // With the party unknown, no player combatant is verified: a party list
    // kept from an earlier load is stale, and a prepared player token is a
    // snapshot whose HP and conditions may be wrong. Neither launches; the
    // GM is asked instead, and the counts below say so.
    if (!partyAvailable) combatants = combatants.filter(combatant => combatant?.type !== 'player');
    companionNpcs.filter(npc => includedCompanionIds.includes(npc.id)).forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    queuedNpcs.forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    npcs.filter(npc => extraNpcIds.includes(npc.id)).forEach(npc => { combatants = appendUnique(combatants, npcToCombatant(npc)); });
    quickCombatants.forEach(combatant => { combatants = appendUnique(combatants, combatant); });
    return combatants;
  }, [baseCombatants, players, enabledBaseKeys, includedPlayerIds, companionNpcs,
    includedCompanionIds, queuedNpcs, npcs, extraNpcIds, quickCombatants, partyAvailable]);

  const rosterCounts = useMemo(() => {
    const npcIdSet = new Set([
      ...includedCompanionIds,
      ...extraNpcIds,
      ...queuedNpcs.map(npc => npc.id),
    ].map(String));
    let party = 0;
    let npcCount = 0;
    let temporary = 0;
    let enemies = 0;
    launchRoster.forEach(combatant => {
      if (combatant.type === 'player') party += 1;
      else if (combatant.temporary) temporary += 1;
      else if (npcIdSet.has(String(combatant.id)) || npcIdSet.has(String(combatant.npc_id))) npcCount += 1;
      else enemies += 1;
    });
    return { party, npcs: npcCount, temporary, enemies, total: launchRoster.length };
  }, [launchRoster, includedCompanionIds, extraNpcIds, queuedNpcs]);

  // Prepared player tokens that no loaded party member answers for launch as
  // their saved snapshot (so a prepared player is never silently dropped).
  // They are listed in the Party section, labelled, so the GM sees and can
  // untick exactly what will launch. Decided by the same builder the launch
  // uses: a snapshot is a token the builder returns as itself.
  const preparedSnapshots = useMemo(() => {
    if (!partyAvailable) return [];
    const everyone = players.map(player => player.id);
    return baseCombatants
      .map((combatant, index) => ({ combatant, index, key: keyFor(combatant, index) }))
      .filter(({ combatant }) => combatant?.type === 'player')
      .filter(({ combatant, key }) => {
        const resolved = combinePreparedEncounterParty([combatant], players, [keyFor(combatant, 0)], everyone);
        return resolved.length === 1 && resolved[0] === combatant && Boolean(key);
      });
  }, [baseCombatants, players, partyAvailable]);

  const readiness = useMemo(
    () => describeLaunchReadiness({ loadErrors, roster: launchRoster, partyLoaded: partyAvailable }),
    [loadErrors, launchRoster, partyAvailable],
  );

  const launch = () => {
    // One launch per press: a double tap must not start two fights.
    if (launchingRef.current) return;
    // Only the party being unknown pauses a fight, and then it is the GM's
    // call. A failed saved-NPC or companion lookup is a warning: those are
    // suggestions, and the verified roster is still the roster.
    let verdict = readiness;
    if (verdict.needsPartyConfirmation) {
      const goAhead = window.confirm(`${PARTY_UNAVAILABLE_MESSAGE}\n\nStart this fight without the player characters?`);
      if (!goAhead) return;
      verdict = describeLaunchReadiness({
        loadErrors, roster: launchRoster, partyLoaded: partyAvailable, withoutPartyConfirmed: true,
      });
    }
    if (!verdict.canLaunch) {
      toast.error(verdict.blockReason);
      return;
    }

    // The roster must be built from this encounter's own draft. Selection
    // and draft are looked up together, but check rather than trust it: a
    // mixed roster is worse than no fight.
    const encounterId = selected?.id || '';
    if (selectedId !== encounterId
      || !draftMatches(draft, { accountId, campaignId, encounterId })
      || selectionCampaignRef.current !== campaignId
      || currentCombatAccount() !== accountId) {
      toast.error('Encounter Review changed while starting. Check the roster and press Start again.');
      return;
    }

    const combatants = launchRoster;
    verdict.warnings.forEach(message => toast.warning(message));
    launchingRef.current = true;

    if (selected) {
      try { localStorage.setItem(`gm.lastEncounter.${campaignId}`, selected.id || ''); } catch { /* ignore */ }
    }
    clearQueuedNpcIds(localStorage, campaignId);
    // The review has been used. Like the NPC queue above, it is consumed by
    // the fight it built, so last session's exclusions cannot quietly shape
    // the next time this encounter is run.
    discardDraft();
    navigate(`/combat/${campaignId}`, {
      state: {
        scenario: encounterBattleScenario(selected, combatants, battleMapId),
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
        <select aria-label="Choose battle type" value={selectedId} onChange={event => selectEncounter(event.target.value)} style={selectStyle}>
          <option value="">Impromptu Battle — build as you go</option>
          {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name || 'Untitled Encounter'}</option>)}
        </select>
      </header>

      <label style={{ ...sectionStyle, gap: 5, fontSize: 12 }}>
        <strong>Battle map</strong>
        <select
          aria-label="Battle map for this encounter"
          value={battleMapId}
          onChange={event => setBattleMapId(event.target.value)}
          style={selectStyle}
        >
          <option value="">No linked map — choose one during combat</option>
          {battleMaps.map(map => (
            <option key={String(map.id)} value={String(map.id)}>{map.name || 'Untitled map'}</option>
          ))}
          {battleMapId && !battleMaps.some(map => String(map.id) === battleMapId) && (
            <option value={battleMapId}>Previously linked map ({battleMapId})</option>
          )}
        </select>
        <span style={mutedStyle}>The selected map opens with the battle tracker when you start combat. Enemy details stay GM-only.</span>
        {battleMapsUnavailable && <span role="status">Map list could not be refreshed; combat can still start and maps can be selected there.</span>}
        {battleMapMissing && <span role="status">The linked map is not in the loaded map list. Choose another map before starting for automatic display.</span>}
      </label>

      <LiveDataWarning errors={loadErrors} onRetry={retryLoad} compact />
      {partyStatus === 'failed' && (
        // Retry lives on the data warning just above, which always lists the
        // party when it failed; a second button here read as a second problem.
        <div role="alert" data-testid="live-encounter-party-unavailable" style={partyWarningStyle}>
          <span>{PARTY_UNAVAILABLE_MESSAGE} They are not in this roster. Use Retry above to load them.</span>
        </div>
      )}
      {draftPersistence !== 'saved' && (
        <div role="status" data-testid="live-encounter-draft-warning" style={draftWarningStyle}>
          This browser would not save your review choices. They are kept while Rookie stays open, but will be lost if the page reloads.
        </div>
      )}
      <footer style={footerStyle} data-testid="live-encounter-run-bar">
        <span style={footerTextStyle} data-testid="live-encounter-roster-counts">
          {`Party: ${rosterCounts.party} · Enemies: ${rosterCounts.enemies} · NPCs: ${rosterCounts.npcs}`
            + ` · Temporary: ${rosterCounts.temporary} · Total: ${rosterCounts.total} `
            + `${rosterCounts.total === 1 ? 'combatant' : 'combatants'}`}
          {' · Your saved encounter stays unchanged.'}
        </span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={resetReview}
            data-testid="live-encounter-reset-review"
            style={resetButtonStyle}
          >
            Reset review
          </button>
          <button type="button" onClick={launch} style={launchButtonStyle} data-testid="live-encounter-start">
            <Play size={17} /> {selected ? 'Start Prepared Encounter' : 'Start Impromptu Battle'}
          </button>
        </span>
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

      <ParticipantSection title="Party" count={partyAvailable ? players.length + preparedSnapshots.length : 0}>
        {!partyAvailable && <span style={mutedStyle}>{partyStatus === 'failed' ? 'Party unavailable — retry to include player characters.' : 'Loading the party…'}</span>}
        {partyAvailable && players.length === 0 && preparedSnapshots.length === 0 && <span style={mutedStyle}>No linked player characters yet.</span>}
        {preparedSnapshots.map(({ combatant, key }) => (
          <ToggleRow
            key={`snapshot-${key}`}
            checked={enabledBaseKeys.includes(key)}
            title={combatant.name || 'Player'}
            meta={`Prepared snapshot · not in the current party · HP ${combatant.hp ?? '?'}${combatant.maxHp ? ` / ${combatant.maxHp}` : ''}`}
            onClick={() => toggle(key, enabledBaseKeys, setEnabledBaseKeys)}
          />
        ))}
        {partyAvailable && players.map(player => {
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
const launchButtonStyle = {
  minHeight: 46,
  border: '1px solid var(--rq-secondary, #3C92E0)',
  backgroundColor: 'var(--rq-control-blue, #0B1B2B)',
  backgroundImage: 'var(--rq-citrus-gradient, linear-gradient(90deg, #FF8A1F 0%, #FF8A1F 28%, #F4551F 50%, #E03A2F 72%, #E03A2F 100%))',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'left bottom',
  backgroundSize: '100% 3px',
  borderRadius: 8,
  color: 'var(--rq-text-primary, #EADFC8)',
  padding: '0 17px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  cursor: 'pointer',
  fontWeight: 850,
  fontSize: 12,
};
const resetButtonStyle = { minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 6, border: '1px solid rgba(234,223,200,.22)', background: 'transparent', color: 'var(--rq-text-secondary, rgba(234,223,200,.78))', fontSize: 12, fontWeight: 800, cursor: 'pointer' };
const partyWarningStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', border: '1px solid var(--rq-warning, #D39A43)', borderRadius: 8, background: 'var(--rq-bg-panel, #0B1B2B)', color: 'var(--rq-text-primary, #EADFC8)', padding: '8px 10px', fontSize: 12, lineHeight: 1.4 };
const draftWarningStyle = { border: '1px solid var(--rq-warning, #D39A43)', borderRadius: 8, background: 'var(--rq-bg-panel, #0B1B2B)', color: 'var(--rq-text-primary, #EADFC8)', padding: '8px 10px', fontSize: 12, lineHeight: 1.4 };
const mutedStyle = { color: rq.muted, fontSize: 9, padding: 3 };
const emptyStyle = { minHeight: 130, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, textAlign: 'center', padding: 16, fontSize: 10 };
