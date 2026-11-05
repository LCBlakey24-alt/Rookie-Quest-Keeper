/**
 * What the GM has chosen for this encounter, kept while they look elsewhere.
 *
 * Encounter Review held its selections in plain component state, and two
 * things threw them away.
 *
 * LiveSessionGridMode keys the tool body on the active tool, so opening Notes
 * unmounts the launcher and React discards everything in it. Coming back
 * rebuilt it from scratch.
 *
 * Worse, the reset effect depended on `baseCombatants`, which is derived from
 * the scenario object. Any refresh that produced a new object reference --
 * including the GM pressing Retry -- re-ran it and cleared the enabled
 * combatants, the companions, the extra NPCs, every quick-added creature and
 * the half-typed creature form, for the same encounter with identical
 * content.
 *
 * So the draft lives here instead, per campaign and per encounter, and is
 * reconciled against refreshed data by stable id rather than rebuilt.
 *
 * Inclusion is stored as EXCLUSIONS for things that default to in (prepared
 * combatants, party members) and as selections for things that default to out
 * (travelling companions, extra NPCs). That is what makes a refresh safe: a
 * participant the GM deliberately removed stays removed, and one that has
 * only just appeared is present without having to guess which case it is.
 *
 * Only choices live here. No character hit points, no combat state. The
 * roster is still built from canonical data at launch.
 */

export const DRAFT_VERSION = 1;

export const EMPTY_QUICK_DRAFT = { name: '', quantity: '1', hp: '', ac: '', initiative: '' };

function keyPrefix(campaignId) {
  return `rqk.encounterReviewDraft.${campaignId}`;
}

export function draftStorageKey(campaignId, encounterId) {
  return `${keyPrefix(campaignId)}.${encounterId || '__impromptu__'}`;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean))];
}

export function createEmptyDraft(campaignId, encounterId) {
  return {
    version: DRAFT_VERSION,
    campaignId: String(campaignId || ''),
    encounterId: String(encounterId || ''),
    disabledBaseKeys: [],
    excludedPlayerIds: [],
    includedCompanionIds: [],
    extraNpcIds: [],
    quickCombatants: [],
    quickDraft: { ...EMPTY_QUICK_DRAFT },
    savedAt: 0,
  };
}

/**
 * Fold refreshed data into a draft without undoing the GM's decisions.
 *
 * Anything that has gone is forgotten. Anything new is left at its default --
 * in for prepared combatants and party members, out for optional NPCs -- so a
 * player who joins mid-session appears, and one who was deliberately taken
 * out does not come back.
 */
export function reconcileDraft(draft, available = {}) {
  const base = draft && typeof draft === 'object' ? draft : createEmptyDraft('', '');
  const baseKeys = new Set(uniqueStrings(available.baseKeys));
  const playerIds = new Set(uniqueStrings(available.playerIds));
  const companionIds = new Set(uniqueStrings(available.companionIds));
  const npcIds = new Set(uniqueStrings(available.npcIds));

  return {
    ...createEmptyDraft(base.campaignId, base.encounterId),
    ...base,
    version: DRAFT_VERSION,
    // Exclusions survive a refresh; exclusions of things that no longer
    // exist do not linger and silently hide a later record reusing the key.
    disabledBaseKeys: uniqueStrings(base.disabledBaseKeys).filter(key => baseKeys.has(key)),
    excludedPlayerIds: uniqueStrings(base.excludedPlayerIds).filter(id => playerIds.has(id)),
    // Opt-ins only survive while the thing is still on offer.
    includedCompanionIds: uniqueStrings(base.includedCompanionIds).filter(id => companionIds.has(id)),
    extraNpcIds: uniqueStrings(base.extraNpcIds).filter(id => npcIds.has(id)),
    // Quick-added creatures belong to the GM, not to the backend. Nothing
    // the server says can remove them.
    quickCombatants: Array.isArray(base.quickCombatants) ? base.quickCombatants : [],
    quickDraft: { ...EMPTY_QUICK_DRAFT, ...(base.quickDraft || {}) },
  };
}

/** Which prepared combatants are in, given the draft's exclusions. */
export function enabledBaseKeysFrom(draft, baseKeys = []) {
  const disabled = new Set(uniqueStrings(draft?.disabledBaseKeys));
  return uniqueStrings(baseKeys).filter(key => !disabled.has(key));
}

/** Which party members are in, given the draft's exclusions. */
export function includedPlayerIdsFrom(draft, playerIds = []) {
  const excluded = new Set(uniqueStrings(draft?.excludedPlayerIds));
  return uniqueStrings(playerIds).filter(id => !excluded.has(id));
}

/** Whether this draft holds anything the GM would mind losing. */
export function draftHasUnsavedWork(draft) {
  if (!draft) return false;
  const quick = draft.quickDraft || {};
  const typing = Boolean(String(quick.name || '').trim())
    || Boolean(String(quick.hp || '').trim())
    || Boolean(String(quick.ac || '').trim())
    || Boolean(String(quick.initiative || '').trim());
  return Boolean(
    (draft.disabledBaseKeys || []).length
    || (draft.excludedPlayerIds || []).length
    || (draft.includedCompanionIds || []).length
    || (draft.extraNpcIds || []).length
    || (draft.quickCombatants || []).length
    || typing,
  );
}

function storage(provided) {
  if (provided) return provided;
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Read this campaign and encounter's draft.
 *
 * A stored draft naming a different campaign or encounter is ignored rather
 * than adapted: a selection made for one table must never appear at another.
 */
export function readDraft(campaignId, encounterId, provided) {
  const store = storage(provided);
  if (!store || !campaignId) return null;
  try {
    const raw = store.getItem(draftStorageKey(campaignId, encounterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Number(parsed.version) !== DRAFT_VERSION) return null;
    if (String(parsed.campaignId) !== String(campaignId)) return null;
    if (String(parsed.encounterId || '') !== String(encounterId || '')) return null;
    return { ...createEmptyDraft(campaignId, encounterId), ...parsed };
  } catch {
    return null;
  }
}

export function writeDraft(draft, provided) {
  const store = storage(provided);
  if (!store || !draft?.campaignId) return false;
  try {
    store.setItem(
      draftStorageKey(draft.campaignId, draft.encounterId),
      JSON.stringify({ ...draft, version: DRAFT_VERSION, savedAt: Date.now() }),
    );
    return true;
  } catch {
    // A full or blocked store costs the GM the draft on a tool switch, which
    // is the behaviour they had before. It must not break the review.
    return false;
  }
}

export function clearDraft(campaignId, encounterId, provided) {
  const store = storage(provided);
  if (!store) return;
  try {
    store.removeItem(draftStorageKey(campaignId, encounterId));
  } catch { /* nothing to do */ }
}
