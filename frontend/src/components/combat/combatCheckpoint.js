import { getAuthToken } from '@/lib/auth';
import { getOfflineIdentityFromToken } from '@/offline/offlineApiCache';

/**
 * Reading back a fight that is already in progress.
 *
 * CombatPageTable takes its encounter from location.state. That is fine when
 * the GM walks in from Encounter Review, and useless the moment the tab is
 * refreshed, restored by the browser, or opened a second time on the table
 * laptop: the state is gone, the page reports "No combat encounter found" and
 * navigates away, while the whole fight sits in localStorage unread.
 *
 * The checkpoint already holds everything needed to carry on, so recovery is
 * a matter of reading it rather than of storing more. What it does need is
 * care. A half-written, foreign or future-format checkpoint must be refused
 * outright, because the alternative is a plausible looking fight that later
 * syncs wrong hit points onto real character sheets. Refusing costs the GM a
 * manual restart; accepting quietly costs them their players' records.
 */

export const CHECKPOINT_VERSION = 3;

// Match the established #759 offline account key convention. Never use the
// unverified dm_username localStorage value as a checkpoint owner.
export function currentCombatAccount() {
  const token = getAuthToken();
  return token ? getOfflineIdentityFromToken(token) : '';
}


export function combatCheckpointKey(campaignId) {
  return `gm.activeCombat.${campaignId}`;
}

function readRaw(campaignId, storage) {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return { status: 'unreadable' };
  try {
    const raw = store.getItem(combatCheckpointKey(campaignId));
    if (!raw) return { status: 'none' };
    return { status: 'read', raw };
  } catch {
    // Private windows and blocked site data both land here. A GM who cannot
    // use local storage should be told the fight is gone, not shown a wrong one.
    return { status: 'unreadable' };
  }
}

function isUsableCombatant(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && String(value.id || '').trim() !== '';
}

// Starting rosters are optional for old fights. An invalid snapshot must
// disable Reset, never make an otherwise valid active fight unrecoverable.
function validatedStartingCombatants(value) {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isUsableCombatant)) return null;
  const ids = value.map(item => String(item.id).trim());
  return new Set(ids).size === ids.length ? value : null;
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Read and validate the checkpoint for one campaign.
 *
 * Returns a status rather than throwing, so the caller can tell "there is no
 * saved fight" apart from "there is one and it cannot be trusted" and say
 * something useful about each.
 */
export function readCombatCheckpoint(campaignId, storage, options = {}) {
  if (!campaignId) return { status: 'none' };

  const attempt = readRaw(campaignId, storage);
  if (attempt.status !== 'read') return { status: attempt.status };

  let parsed;
  try {
    parsed = JSON.parse(attempt.raw);
  } catch {
    return { status: 'corrupt', reason: 'The saved fight could not be read.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { status: 'corrupt', reason: 'The saved fight is not in the expected shape.' };
  }

  // An unknown newer format is left exactly as it is. Guessing at a layout
  // this build does not know would be the misleading recovery this guards.
  const version = finiteOr(parsed.version, 1);
  if (version > CHECKPOINT_VERSION) {
    return { status: 'unsupported', reason: 'The saved fight was written by a newer version of Rookie.' };
  }

  // Older checkpoints predate the campaign stamp. The storage key already
  // carries the campaign, so an absent value is trusted and a present one
  // that disagrees is not.
  if (parsed.campaignId && String(parsed.campaignId) !== String(campaignId)) {
    return { status: 'foreign', reason: 'The saved fight belongs to a different campaign.' };
  }

  // The campaign storage key is not an account boundary: several people may
  // share a browser. Never return private combat data without identity proof.
  const accountId = String(options.accountId || '').trim().toLowerCase();
  if (!accountId) {
    return { status: 'auth-required', reason: 'Sign in to recover this saved fight. Its data has been preserved.' };
  }
  const checkpointOwner = String(parsed.ownerId || '').trim().toLowerCase();
  if (checkpointOwner && checkpointOwner !== accountId) {
    return { status: 'foreign-account', reason: 'A saved fight for another account is stored here. Nothing was changed.' };
  }
  if (!checkpointOwner && options.legacyOwnerVerified !== true) {
    return { status: 'legacy-unverified', reason: 'This older fight has no account owner stamp. Connect to verify campaign ownership before recovery; the save is preserved.' };
  }

  const combatants = Array.isArray(parsed.combatants) ? parsed.combatants : [];
  if (combatants.length === 0 || !combatants.every(isUsableCombatant)) {
    return { status: 'corrupt', reason: 'The saved fight has no usable combatants.' };
  }

  // Equal display names are fine; equal combatant IDs are not. IDs drive HP,
  // initiative, map tokens and reactions and must remain unique.
  if (new Set(combatants.map(item => String(item.id))).size !== combatants.length) {
    return { status: 'corrupt', reason: 'The saved fight contains duplicate combatant IDs.' };
  }

  const round = Math.max(1, Math.floor(finiteOr(parsed.round, 1)));
  const currentTurn = Math.min(
    Math.max(0, Math.floor(finiteOr(parsed.currentTurn, 0))),
    combatants.length - 1,
  );

  return {
    status: 'ok',
    checkpoint: {
      version,
      ownerId: accountId,
      campaignId: String(campaignId),
      scenarioId: String(parsed.scenarioId || ''),
      scenarioName: String(parsed.scenarioName || ''),
      combatants,
      startingCombatants: validatedStartingCombatants(parsed.startingCombatants),
      currentTurn,
      round,
      selectedMapId: String(parsed.selectedMapId || ''),
      terrain_type: String(parsed.terrain_type || 'stone'),
      grid_cols: Math.max(5, Math.min(100, Math.floor(finiteOr(parsed.grid_cols, 30)))),
      grid_rows: Math.max(5, Math.min(100, Math.floor(finiteOr(parsed.grid_rows, 20)))),
      feet_per_square: Math.max(1, Math.min(100, Math.floor(finiteOr(parsed.feet_per_square, 5)))),
      show_grid: parsed.show_grid !== false,
      mapTokens: Array.isArray(parsed.mapTokens) ? parsed.mapTokens : [],
      collectedLoot: Array.isArray(parsed.collectedLoot) ? parsed.collectedLoot : [],
      initialPlayerStates: (parsed.initialPlayerStates && typeof parsed.initialPlayerStates === 'object')
        ? parsed.initialPlayerStates : {},
      source: parsed.source === 'live-play' ? 'live-play' : 'campaign-prep',
      campaignName: String(parsed.campaignName || ''),
      savedAt: finiteOr(parsed.savedAt, 0),
    },
  };
}

/**
 * The encounter the rest of the page expects, rebuilt from the checkpoint.
 *
 * Marked as recovered so the initialisation path can tell this apart from a
 * launch and avoid treating current, damaged combatants as a starting state.
 */
export function scenarioFromCheckpoint(checkpoint) {
  if (!checkpoint) return null;
  return {
    id: checkpoint.scenarioId || checkpoint.scenarioName || 'recovered-combat',
    name: checkpoint.scenarioName || 'Combat in progress',
    combatants: checkpoint.combatants,
    map_id: checkpoint.selectedMapId || '',
    terrain_type: checkpoint.terrain_type || 'stone',
    grid_cols: checkpoint.grid_cols || 30,
    grid_rows: checkpoint.grid_rows || 20,
    feet_per_square: checkpoint.feet_per_square || 5,
    show_grid: checkpoint.show_grid !== false,
    recovered: true,
  };
}

/**
 * The pre-combat state of each linked character, exactly as it was stored.
 *
 * Never derived from the combatants in the checkpoint. Those carry current
 * hit points, and treating a wounded total as the baseline would either sync
 * damage that already happened or hide damage that did. When the baseline is
 * absent it stays absent, and CombatPageTable's existing guard refuses an
 * offline end rather than guessing.
 */
export function recoveredBaselines(checkpoint) {
  const stored = checkpoint?.initialPlayerStates;
  if (!stored || typeof stored !== 'object') return {};
  const present = new Set(
    (checkpoint.combatants || [])
      .filter(item => item?.character_id)
      .map(item => String(item.character_id)),
  );
  return Object.keys(stored).reduce((result, characterId) => {
    if (present.has(String(characterId))) result[characterId] = stored[characterId];
    return result;
  }, {});
}
