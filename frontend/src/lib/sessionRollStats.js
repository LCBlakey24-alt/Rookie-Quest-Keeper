import apiClient from '@/lib/apiClient';

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

export function normaliseRollEvent(rollEvent = {}) {
  return {
    id: rollEvent.id || `roll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
  const event = normaliseRollEvent(rollEvent);
  writeList(sessionKey(campaignId), [...readList(sessionKey(campaignId)), event], 500);
  writeList(allTimeKey(campaignId), [...readList(allTimeKey(campaignId)), event], 5000);
  return event;
}

export async function recordRemoteRoll(campaignId, rollEvent = {}) {
  if (!campaignId) return null;
  const event = normaliseRollEvent(rollEvent);
  recordSessionRoll(campaignId, event);
  try {
    const response = await apiClient.post(`/campaigns/${campaignId}/roll-events`, event);
    return response.data;
  } catch {
    return event;
  }
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
  const focusEvents = playerFocus && playerEvents.length ? playerEvents : events;
  const byActor = new Map();
  let highestTotal = null;
  let biggestD20 = null;
  let totalDice = 0;
  let nat20s = 0;
  let nat1s = 0;
  let explosions = 0;

  for (const event of focusEvents) {
    const actor = event.character_name || event.actor || 'Player';
    if (!byActor.has(actor)) byActor.set(actor, { name: actor, rolls: 0, dice: 0, nat20s: 0, nat1s: 0, explosions: 0, highestTotal: 0 });
    const stats = byActor.get(actor);
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
      if (!biggestD20 || Number(roll.result) > Number(biggestD20.result)) biggestD20 = { ...roll, actor, label: event.label };
    }
  }

  const actors = Array.from(byActor.values()).sort((a, b) => b.rolls - a.rolls || b.nat20s - a.nat20s || a.name.localeCompare(b.name));
  const mostCrits = [...actors].sort((a, b) => b.nat20s - a.nat20s)[0];
  const mostFumbles = [...actors].sort((a, b) => b.nat1s - a.nat1s)[0];
  const busiest = actors[0];
  const awards = [
    mostCrits?.nat20s ? { title: 'Crit Goblin', name: mostCrits.name, value: `${mostCrits.nat20s} Nat 20${mostCrits.nat20s === 1 ? '' : 's'}` } : null,
    mostFumbles?.nat1s ? { title: 'Dice Betrayal', name: mostFumbles.name, value: `${mostFumbles.nat1s} Nat 1${mostFumbles.nat1s === 1 ? '' : 's'}` } : null,
    busiest?.rolls ? { title: 'Button Masher', name: busiest.name, value: `${busiest.rolls} player roll${busiest.rolls === 1 ? '' : 's'}` } : null,
    highestTotal ? { title: 'Big Number Energy', name: highestTotal.character_name || highestTotal.actor || 'Player', value: `${highestTotal.total} on ${highestTotal.label || highestTotal.notation || 'a roll'}` } : null,
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
