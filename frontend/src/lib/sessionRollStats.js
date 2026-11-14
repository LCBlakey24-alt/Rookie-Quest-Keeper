import apiClient from '@/lib/apiClient';
import { loadDisplayState } from '@/lib/liveDisplayBus';
import { getOfflineCacheScope } from '@/offline/offlineApiCache';
import {
  listPendingRolls,
  queuePendingRoll,
  removePendingRoll,
} from '@/offline/offlineRollSyncQueue';

const sessionKey = (campaignId) => `rqk.rollStats.session.${campaignId}`;
const allTimeKey = (campaignId) => `rqk.rollStats.allTime.${campaignId}`;
const archiveKey = (campaignId) => `rqk.rollStats.archive.${campaignId}`;

function readList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeList(key, list, limit = 1200) {
  try { localStorage.setItem(key, JSON.stringify(list.slice(-limit))); } catch { /* ignore */ }
}

function normaliseActor(actor, label) {
  if (actor) return actor;
  const beforeColon = String(label || '').split(':')[0]?.trim();
  return beforeColon && beforeColon.length > 2 ? beforeColon : 'GM / Table';
}

function activeGroupCheckForRoll(campaignId, event = {}) {
  if (!campaignId || event.group_check_id || event.groupCheckId || event.actor_type !== 'player') return {};
  // Damage/healing rolls must not fill a GM's pending d20 group check.
  // Only a reported kept d20 can answer that prompt.
  const dice = Array.isArray(event.visibleRolls) && event.visibleRolls.length
    ? event.visibleRolls : event.rolls;
  if (!Array.isArray(dice) || !dice.some(die =>
    die && typeof die === 'object' && Number(die.sides) === 20 && !die.dropped
  )) return {};
  try {
    const state = loadDisplayState(campaignId);
    if (state?.mode !== 'group-check') return {};
    const payload = state.payload || {};
    const groupCheckId = payload.group_check_id || payload.id;
    if (!groupCheckId || payload.status === 'closed') return {};
    return {
      group_check_id: groupCheckId,
      requested_roll_id: payload.id || groupCheckId,
      check_name: payload.check_name || payload.title || '',
    };
  } catch {
    return {};
  }
}

function attachActiveGroupCheck(campaignId, event) {
  const detected = activeGroupCheckForRoll(campaignId, event);
  if (!detected.group_check_id) return event;
  return {
    ...event,
    group_check_id: detected.group_check_id,
    requested_roll_id: event.requested_roll_id || event.requestedRollId || detected.requested_roll_id,
    check_name: event.check_name || event.checkName || detected.check_name,
  };
}

function newRollEventId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `roll-${crypto.randomUUID()}`;
  } catch { /* fall through */ }
  return `roll-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function normaliseRollEvent(rollEvent = {}) {
  const id = rollEvent.client_event_id || rollEvent.id || newRollEventId();
  return {
    id,
    // One player action, one id. The server records a roll once per id, so
    // re-sending this exact event (a retry) can never count it twice.
    client_event_id: id,
    actor: normaliseActor(rollEvent.actor || rollEvent.character_name, rollEvent.label),
    actor_type: rollEvent.actor_type || 'gm',
    character_id: rollEvent.character_id || '',
    character_name: rollEvent.character_name || '',
    group_check_id: rollEvent.group_check_id || rollEvent.groupCheckId || '',
    requested_roll_id: rollEvent.requested_roll_id || rollEvent.requestedRollId || '',
    check_name: rollEvent.check_name || rollEvent.checkName || '',
    label: rollEvent.label || rollEvent.notation || 'Roll',
    notation: rollEvent.notation || '',
    total: Number(rollEvent.total) || 0,
    modifier: Number(rollEvent.modifier) || 0,
    rolls: Array.isArray(rollEvent.rolls) ? rollEvent.rolls : [],
    visibleRolls: Array.isArray(rollEvent.visibleRolls) ? rollEvent.visibleRolls : Array.isArray(rollEvent.rolls) ? rollEvent.rolls : [],
    isCrit: Boolean(rollEvent.isCrit),
    isFumble: Boolean(rollEvent.isFumble),
    explosionCount: Number(rollEvent.explosionCount) || 0,
    created_at: rollEvent.created_at || new Date().toISOString(),
  };
}

export function recordSessionRoll(campaignId, rollEvent = {}) {
  if (!campaignId || typeof localStorage === 'undefined') return null;
  const event = normaliseRollEvent(attachActiveGroupCheck(campaignId, rollEvent));
  const append = (list) => (list.some(item => item?.id === event.id) ? list : [...list, event]);
  writeList(sessionKey(campaignId), append(readList(sessionKey(campaignId))), 500);
  writeList(allTimeKey(campaignId), append(readList(allTimeKey(campaignId))), 5000);
  return event;
}

const RETRY_DELAYS_MS = [400, 1500];
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Only a lost connection or a server fault is worth sending again. A 4xx is
// the server's answer about this roll and will not change.
function worthRetrying(error) {
  const status = Number(error?.response?.status);
  return !status || status >= 500;
}

function shouldDiscardPendingRoll(error) {
  const status = Number(error?.response?.status);
  const temporarilyBlocked = [401, 408, 425, 429].includes(status);
  return status >= 400 && status < 500 && !temporarilyBlocked;
}

let activeRollFlush = null;

function rollActorKey(event = {}) {
  const characterId = String(event.character_id || '');
  if (characterId) return `character:${characterId}`;
  return `${event.actor_type || 'gm'}:${event.character_name || event.actor || 'table'}`;
}

function isSameRollStream(record, campaignId, event) {
  return String(record?.campaignId || '') === String(campaignId || '')
    && rollActorKey(record?.event) === rollActorKey(event);
}

/** Replay only the current account's exact queued events, oldest first. */
export function flushPendingRemoteRolls() {
  const scope = getOfflineCacheScope();
  if (activeRollFlush?.scope === scope) return activeRollFlush.promise;

  const records = listPendingRolls(scope).filter(record => record?.scope === scope);
  const promise = (async () => {
    let delivered = 0;
    let discarded = 0;

    for (const record of records) {
      // A sign-out/account switch during the flush must never deliver the old
      // account's character event with the new account's bearer token.
      if (getOfflineCacheScope() !== scope) break;
      try {
        await apiClient.post(
          `/campaigns/${record.campaignId}/roll-events`,
          record.event,
          { rqkExpectedAuthScope: scope },
        );
        removePendingRoll(record.key);
        delivered += 1;
      } catch (error) {
        if (shouldDiscardPendingRoll(error)) {
          removePendingRoll(record.key);
          discarded += 1;
          continue;
        }
        // Offline, server failures, rate limits and expired sessions stay
        // durable for the next reconnect or authenticated app wake.
        break;
      }
    }

    return { delivered, remaining: records.length - delivered - discarded };
  })();

  activeRollFlush = { scope, promise };
  promise.then(() => {
    if (activeRollFlush?.promise === promise) activeRollFlush = null;
  }, () => {
    if (activeRollFlush?.promise === promise) activeRollFlush = null;
  });
  return promise;
}

async function drainPendingRemoteRolls(scope = getOfflineCacheScope()) {
  // Usually one pass drains the snapshot. A second pass matters when a rapid
  // roll is queued while another flush is already in flight: wait for that
  // snapshot, then send the newly queued roll behind it.
  for (let pass = 0; pass < 10 && getOfflineCacheScope() === scope; pass += 1) {
    const before = listPendingRolls(scope).filter(record => record?.scope === scope).length;
    if (!before) return;
    await flushPendingRemoteRolls();
    const after = listPendingRolls(scope).filter(record => record?.scope === scope).length;
    if (!after || after >= before) return;
  }
}

export async function recordRemoteRoll(campaignId, rollEvent = {}) {
  if (!campaignId) return null;
  const event = normaliseRollEvent(attachActiveGroupCheck(campaignId, rollEvent));
  const scope = getOfflineCacheScope();
  const olderPending = listPendingRolls(scope).filter(record => record?.scope === scope);
  // Queue synchronously before the first request. Closing the tab while a
  // request is in flight can no longer erase the only copy of the roll.
  const pending = queuePendingRoll({ scope, campaignId, event });
  recordSessionRoll(campaignId, event);

  // Do not let a fresh roll overtake an older offline roll from the same
  // character/table stream. The ordered drain sends the old event first, so
  // a delayed group-check answer cannot replace the player's newer answer.
  if (pending && olderPending.some(record => isSameRollStream(record, campaignId, event))) {
    drainPendingRemoteRolls(scope).catch(() => {});
    return { ...event, queued: true };
  }

  for (let attempt = 0; ; attempt += 1) {
    if (getOfflineCacheScope() !== scope) return { ...event, queued: Boolean(pending), syncFailed: !pending };
    try {
      // The identical event every time, so a retry is recognised, not re-counted.
      const response = await apiClient.post(
        `/campaigns/${campaignId}/roll-events`,
        event,
        { rqkExpectedAuthScope: scope },
      );
      removePendingRoll(pending?.key);
      return response.data;
    } catch (error) {
      if (shouldDiscardPendingRoll(error)) {
        removePendingRoll(pending?.key);
        return { ...event, syncFailed: true };
      }
      if (attempt >= RETRY_DELAYS_MS.length || !worthRetrying(error)) {
        return { ...event, queued: Boolean(pending), syncFailed: !pending };
      }
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }
}

let queuedRollSyncInstalled = false;

export function installQueuedRollSync() {
  if (queuedRollSyncInstalled || typeof window === 'undefined') return;
  queuedRollSyncInstalled = true;
  const flush = () => { drainPendingRemoteRolls().catch(() => {}); };
  window.addEventListener('online', flush);
  window.addEventListener('focus', flush);
  window.addEventListener('rqk:auth-scope-changed', flush);
  window.setTimeout(flush, 0);
}

function d20sFor(event) {
  return (event.visibleRolls || event.rolls || []).filter(roll => Number(roll.sides) === 20 && !roll.dropped);
}

function emptySummary(campaignName = 'Campaign') {
  return {
    campaignName,
    generated_at: new Date().toISOString(),
    session: { totalRolls: 0, playerRolls: 0, gmRolls: 0, totalDice: 0, nat20s: 0, nat1s: 0, explosions: 0, highestTotal: null, biggestD20: null, actors: [], awards: [] },
    allTime: { totalRolls: 0, playerRolls: 0, gmRolls: 0, totalDice: 0, nat20s: 0, nat1s: 0, explosions: 0, actors: [] },
  };
}

function summarise(events = [], playerFocus = true) {
  const playerEvents = events.filter(event => event.actor_type === 'player');
  const gmEvents = events.filter(event => event.actor_type !== 'player');
  // Never turn a GM-only session into a player recap when no player rolled.
  const focusEvents = playerFocus ? playerEvents : events;
  const byActor = new Map();
  let highestTotal = null;
  let biggestD20 = null;
  let totalDice = 0;
  let nat20s = 0;
  let nat1s = 0;
  let explosions = 0;

  for (const event of focusEvents) {
    const actor = event.character_name || event.actor || 'Player';
    const characterId = String(event.character_id || '');
    const actorKey = characterId ? `character:${characterId}`
      : event.user_id ? `legacy-account:${event.user_id}` : `legacy-name:${actor}`;
    if (!byActor.has(actorKey)) byActor.set(actorKey, {
      name: actor, rolls: 0, dice: 0, nat20s: 0, nat1s: 0, explosions: 0, highestTotal: 0,
      ...(characterId ? { character_id: characterId } : {}),
    });
    const stats = byActor.get(actorKey);
    const visible = event.visibleRolls || event.rolls || [];
    const d20s = d20sFor(event);
    stats.rolls += 1;
    stats.dice += visible.length;
    stats.explosions += Number(event.explosionCount) || 0;
    stats.highestTotal = Math.max(stats.highestTotal, Number(event.total) || 0);
    totalDice += visible.length;
    explosions += Number(event.explosionCount) || 0;
    if (!highestTotal || Number(event.total) > Number(highestTotal.total)) highestTotal = event;
    for (const roll of d20s) {
      if (roll.result === 20) { nat20s += 1; stats.nat20s += 1; }
      if (roll.result === 1) { nat1s += 1; stats.nat1s += 1; }
      if (!biggestD20 || Number(roll.result) > Number(biggestD20.result)) biggestD20 = {
        ...roll, actor, label: event.label,
        ...(characterId ? { character_id: characterId } : {}),
      };
    }
  }

  const actors = Array.from(byActor.values()).sort((a, b) => b.rolls - a.rolls || b.nat20s - a.nat20s || a.name.localeCompare(b.name) || String(a.character_id || '').localeCompare(String(b.character_id || '')));
  const mostCrits = [...actors].sort((a, b) => b.nat20s - a.nat20s)[0];
  const mostFumbles = [...actors].sort((a, b) => b.nat1s - a.nat1s)[0];
  const busiest = actors[0];
  const awards = [
    mostCrits?.nat20s ? { title: 'Crit Goblin', name: mostCrits.name, value: `${mostCrits.nat20s} Nat 20${mostCrits.nat20s === 1 ? '' : 's'}`, ...(mostCrits.character_id ? { character_id: mostCrits.character_id } : {}) } : null,
    mostFumbles?.nat1s ? { title: 'Dice Betrayal', name: mostFumbles.name, value: `${mostFumbles.nat1s} Nat 1${mostFumbles.nat1s === 1 ? '' : 's'}`, ...(mostFumbles.character_id ? { character_id: mostFumbles.character_id } : {}) } : null,
    busiest?.rolls ? { title: 'Button Masher', name: busiest.name, value: `${busiest.rolls} player roll${busiest.rolls === 1 ? '' : 's'}`, ...(busiest.character_id ? { character_id: busiest.character_id } : {}) } : null,
    highestTotal ? { title: 'Big Number Energy', name: highestTotal.character_name || highestTotal.actor || 'Player', value: `${highestTotal.total} on ${highestTotal.label || highestTotal.notation || 'a roll'}`, ...(highestTotal.character_id ? { character_id: highestTotal.character_id } : {}) } : null,
  ].filter(Boolean);

  return { totalRolls: focusEvents.length, playerRolls: playerEvents.length, gmRolls: gmEvents.length, totalDice, nat20s, nat1s, explosions, highestTotal, biggestD20, actors, awards };
}

export function buildEndSessionStats(campaignId, campaignName = 'Campaign') {
  if (!campaignId || typeof localStorage === 'undefined') return emptySummary(campaignName);
  return { campaignName, generated_at: new Date().toISOString(), session: summarise(readList(sessionKey(campaignId)), true), allTime: summarise(readList(allTimeKey(campaignId)), true) };
}

export async function endRemoteSessionStats(campaignId, campaignName = 'Campaign') {
  if (!campaignId) return buildEndSessionStats(campaignId, campaignName);
  try {
    const response = await apiClient.post(`/campaigns/${campaignId}/roll-events/end-session`);
    return response.data;
  } catch {
    const fallback = buildEndSessionStats(campaignId, campaignName);
    archiveAndResetSessionStats(campaignId, fallback);
    return fallback;
  }
}

export function archiveAndResetSessionStats(campaignId, summary) {
  if (!campaignId || typeof localStorage === 'undefined') return;
  writeList(archiveKey(campaignId), [...readList(archiveKey(campaignId)), summary], 80);
  try { localStorage.removeItem(sessionKey(campaignId)); } catch { /* ignore */ }
}
