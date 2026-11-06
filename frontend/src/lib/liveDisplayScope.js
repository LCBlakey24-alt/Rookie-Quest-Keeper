/**
 * Who a cached Player Display record belongs to.
 *
 * The display cache, BroadcastChannel and same-tab event used to be keyed by
 * campaign id alone, and sign-out left the cache behind. A campaign id is not
 * an account boundary: on a shared table laptop, account B opened account A's
 * cached reveal before any server check, and kept it on screen through every
 * refused request.
 *
 * Identity follows the convention already used by offline caching (#759),
 * combat checkpoints (#768) and Encounter Review drafts (#764): the `sub` of
 * the current auth token, never the editable stored username. No identity
 * means no private cache at all. This partitions one browser between
 * accounts; authorisation is still the server's job.
 *
 * This module has no imports so that lib/auth.js can use it to clean up on
 * sign-out without an import cycle through liveDisplayBus.
 */

export const LIVE_DISPLAY_PREFIX = 'rqk.liveDisplay.';
const OWNED_PREFIX = `${LIVE_DISPLAY_PREFIX}v2.`;

/** The account a session token names, or '' when it names none. */
export function accountFromToken(token = '') {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return '';
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(padded));
    return String(payload?.sub || payload?.username || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

const part = value => encodeURIComponent(String(value || ''));

export function ownedStorageKey(account, campaignId) {
  return `${OWNED_PREFIX}${part(account)}.${part(campaignId)}`;
}

export function ownedChannelName(account, campaignId) {
  return `rqk-live-display-v2-${part(account)}-${part(campaignId)}`;
}

export function ownedEventName(account, campaignId) {
  return `rqk-live-display-local-v2-${part(account)}-${part(campaignId)}`;
}

/** v1 records: `rqk.liveDisplay.<campaignId>`, with no owner. */
export function isLegacyDisplayKey(key = '') {
  return key.startsWith(LIVE_DISPLAY_PREFIX) && !key.startsWith(OWNED_PREFIX);
}

function storage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function matchingKeys(predicate) {
  const store = storage();
  if (!store) return [];
  const keys = [];
  try {
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key && predicate(key)) keys.push(key);
    }
  } catch { /* storage denied */ }
  return keys;
}

/**
 * Remove display records that no reader may trust: every unowned v1 record,
 * and, when `account` is given, that account's own records.
 *
 * Only display-cache keys are touched. Combat checkpoints, Encounter Review
 * drafts, offline campaign packs and every other account's display records
 * are left exactly as they were. The display cache only ever mirrors server
 * state, so an authorised viewer loses nothing: the next read refills it.
 */
export function purgeDisplayCache(account = '') {
  const store = storage();
  if (!store) return;
  const ownPrefix = account ? `${OWNED_PREFIX}${part(account)}.` : null;
  matchingKeys(key => isLegacyDisplayKey(key) || (ownPrefix && key.startsWith(ownPrefix)))
    .forEach(key => {
      try { store.removeItem(key); } catch { /* best effort */ }
    });
}
