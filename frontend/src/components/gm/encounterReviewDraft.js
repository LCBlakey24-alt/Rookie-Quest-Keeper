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
 * So the draft lives here instead, per ACCOUNT, per campaign and per
 * encounter, and is reconciled against refreshed data by stable id rather
 * than rebuilt.
 *
 * Account scope follows the #759 offline-cache and combat-checkpoint
 * convention: the identity is the `sub` of the current auth token (the same
 * credential the backend authorises every request with), never the editable
 * dm_username value. With no token there is no persistence at all. Session
 * storage survives sign-out within a tab, so the account is part of the key
 * AND stamped inside the record, and a record whose stamp disagrees with the
 * reader is refused. This partitions drafts on a shared browser; it is not
 * authorisation, which remains the backend's job.
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

// v1 drafts (from the unreleased first cut of this feature) carried no
// account. They cannot be attributed to anybody, so they are never read.
export const DRAFT_VERSION = 2;
const KEY_ROOT = 'rqk.encounterReviewDraft';
const KEY_PREFIX = `${KEY_ROOT}.v${DRAFT_VERSION}.`;

export const EMPTY_QUICK_DRAFT = { name: '', quantity: '1', hp: '', ac: '', initiative: '' };

/**
 * In-page copy of every draft written this page lifetime, keyed exactly as
 * storage is. When storage is full, blocked or silently drops the write, the
 * GM still keeps the draft across a tool switch -- just not across a reload.
 */
const memoryDrafts = new Map();

function normaliseAccount(accountId) {
  return String(accountId || '').trim().toLowerCase();
}

export function draftStorageKey(accountId, campaignId, encounterId) {
  const part = value => encodeURIComponent(String(value || ''));
  return `${KEY_PREFIX}${part(normaliseAccount(accountId))}.${part(campaignId)}.${part(encounterId || '__impromptu__')}`;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean))];
}

export function createEmptyDraft(campaignId, encounterId, ownerId = '') {
  return {
    version: DRAFT_VERSION,
    ownerId: normaliseAccount(ownerId),
    campaignId: String(campaignId || ''),
    encounterId: String(encounterId || ''),
    disabledBaseKeys: [],
    excludedPlayerIds: [],
    includedCompanionIds: [],
    extraNpcIds: [],
    quickCombatants: [],
    quickDraft: { ...EMPTY_QUICK_DRAFT },
    // null uses the saved encounter map; '' explicitly launches without one.
    battleMapId: null,
    battlefieldMode: null,
    terrainType: null,
    savedAt: 0,
  };
}

/** Whether `draft` belongs to exactly this account, campaign and encounter. */
export function draftMatches(draft, { accountId, campaignId, encounterId }) {
  return Boolean(draft)
    && normaliseAccount(draft.ownerId) === normaliseAccount(accountId)
    && String(draft.campaignId || '') === String(campaignId || '')
    && String(draft.encounterId || '') === String(encounterId || '');
}

/**
 * Fold refreshed data into a draft without undoing the GM's decisions.
 *
 * Each list in `available` is either an array from a SUCCESSFUL response, or
 * null/undefined when that data has not loaded or failed to load. Only an
 * authoritative array may prune a selection. An empty party while the
 * request is still in flight, or after it failed, is not evidence that the
 * excluded player has left -- treating it as such used to drop the exclusion
 * and bring them back into the fight on the next successful load.
 *
 * Against authoritative data, anything that has gone is forgotten and
 * anything new is left at its default -- in for prepared combatants and party
 * members, out for optional NPCs.
 */
export function reconcileDraft(draft, available = {}) {
  const base = draft && typeof draft === 'object' ? draft : createEmptyDraft('', '');
  const prune = (values, authoritative) => {
    const list = uniqueStrings(values);
    if (!Array.isArray(authoritative)) return list;
    const present = new Set(uniqueStrings(authoritative));
    return list.filter(value => present.has(value));
  };

  return {
    ...createEmptyDraft(base.campaignId, base.encounterId, base.ownerId),
    ...base,
    version: DRAFT_VERSION,
    disabledBaseKeys: prune(base.disabledBaseKeys, available.baseKeys),
    excludedPlayerIds: prune(base.excludedPlayerIds, available.playerIds),
    includedCompanionIds: prune(base.includedCompanionIds, available.companionIds),
    extraNpcIds: prune(base.extraNpcIds, available.npcIds),
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
    || draft.battleMapId !== null && draft.battleMapId !== undefined
    || draft.battlefieldMode !== null && draft.battlefieldMode !== undefined
    || draft.terrainType !== null && draft.terrainType !== undefined
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

function parseOwned(raw, scope) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Number(parsed.version) !== DRAFT_VERSION) return null;
    if (!draftMatches(parsed, scope)) return null;
    return { ...createEmptyDraft(scope.campaignId, scope.encounterId, scope.accountId), ...parsed };
  } catch {
    return null;
  }
}

/**
 * Read this account, campaign and encounter's draft.
 *
 * A record naming a different account, campaign or encounter is refused
 * rather than adapted: a selection made at one table, or by one person, must
 * never appear for another. Without an account nothing is read.
 */
export function readDraft(campaignId, encounterId, { accountId, storage: provided } = {}) {
  const account = normaliseAccount(accountId);
  if (!account || !campaignId) return null;
  const scope = { accountId: account, campaignId, encounterId };
  const key = draftStorageKey(account, campaignId, encounterId);
  // Memory first: it is never older than storage within this page, and it is
  // the only copy when storage refused the last write.
  const remembered = parseOwned(memoryDrafts.get(key), scope);
  if (remembered) return remembered;
  const store = storage(provided);
  if (!store) return null;
  try {
    return parseOwned(store.getItem(key), scope);
  } catch {
    return null;
  }
}

/**
 * Persist a draft for `accountId`.
 *
 * Returns 'saved' only when the write was read back intact. 'memory' means
 * the draft is held for this page only (storage full, denied, unavailable or
 * silently dropped the write). 'refused' means the draft is not this
 * account's -- for example a write left over from before an account switch --
 * and nothing was stored anywhere.
 */
export function writeDraft(draft, { accountId, storage: provided } = {}) {
  const account = normaliseAccount(accountId);
  if (!account || !draft?.campaignId) return 'refused';
  if (normaliseAccount(draft.ownerId) !== account) return 'refused';
  const key = draftStorageKey(account, draft.campaignId, draft.encounterId);
  const serialised = JSON.stringify({ ...draft, ownerId: account, version: DRAFT_VERSION, savedAt: Date.now() });
  memoryDrafts.set(key, serialised);
  const store = storage(provided);
  if (!store) return 'memory';
  try {
    store.setItem(key, serialised);
    return store.getItem(key) === serialised ? 'saved' : 'memory';
  } catch {
    return 'memory';
  }
}

export function clearDraft(campaignId, encounterId, { accountId, storage: provided } = {}) {
  const account = normaliseAccount(accountId);
  if (!account || !campaignId) return;
  const key = draftStorageKey(account, campaignId, encounterId);
  memoryDrafts.delete(key);
  const store = storage(provided);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch { /* nothing to do */ }
}

/**
 * Remove v1 drafts. They carry no account, so they cannot be shown to anyone
 * safely, and holding them only risks a later reader mistaking them for its
 * own. They are choices, never character or campaign data.
 */
export function purgeUnownedDrafts(provided) {
  const store = storage(provided);
  if (!store) return;
  try {
    const stale = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key && key.startsWith(`${KEY_ROOT}.`) && !key.startsWith(KEY_PREFIX)) stale.push(key);
    }
    stale.forEach(key => store.removeItem(key));
  } catch { /* best effort */ }
}

/** Drop in-page copies, e.g. when nobody is signed in any more. */
export function forgetDraftsInMemory() {
  memoryDrafts.clear();
}
