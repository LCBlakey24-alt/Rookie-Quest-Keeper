/**
 * One answer to "which encounter is next", shared by Run and by Review.
 *
 * They used to disagree. Run correctly filtered ready, unplayed, current
 * encounters and sorted them by planned order, but ignored live_default. Its
 * button then called onSelect('combat') and passed no encounter identity at
 * all. Encounter Review chose for itself and preferred live_default or the id
 * remembered in gm.lastEncounter, which is written when a fight LAUNCHES and
 * therefore usually names the encounter the GM has already played.
 *
 * So the GM read one name on Run, clicked it, and opened another. Both
 * surfaces now rank encounters the same way, and the one shown on Run is
 * handed to Review explicitly rather than guessed at again.
 */

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * How ready an encounter is to be run next. Lower sorts first.
 *
 * Played and legacy encounters are reachable -- a GM may deliberately reopen
 * one -- but they are never what the app offers on its own.
 */
function readiness(encounter) {
  if (encounter?.legacy) return 3;
  if (encounter?.played) return 2;
  if (encounter?.live_default) return 0;
  return 1;
}

function plannedOrder(encounter) {
  const raw = encounter?.planned_encounter_order;
  // Null and empty are unplanned, not order zero (Number(null) === 0).
  if (raw == null || raw === '') return Infinity;
  const order = Number(raw);
  return Number.isFinite(order) ? order : Infinity;
}

/** Every encounter, most-likely-next first. The order Run displays. */
export function rankedPreparedEncounters(scenarios) {
  return [...safeArray(scenarios)]
    .filter(item => item && item.id)
    .sort((left, right) => (
      readiness(left) - readiness(right)
      // Within the same readiness, a live_ready encounter comes before a
      // draft, then planned order decides.
      || (right.live_ready ? 1 : 0) - (left.live_ready ? 1 : 0)
      || plannedOrder(left) - plannedOrder(right)
    ));
}

/** The encounter the app offers when the GM has not chosen one. */
export function nextPreparedEncounterId(scenarios) {
  return rankedPreparedEncounters(scenarios)[0]?.id || '';
}

/**
 * Settle on one encounter, saying why.
 *
 * Precedence, strongest first:
 *   requestedId    an explicit handoff -- Run's button, a quest link, Notes
 *   gmSelectedId   a choice the GM made in this session
 *   rememberedId   the last fight launched, but ONLY via Reopen Last
 *   next           the ranking above
 *
 * `missingRequest` names an encounter that was asked for and is not there, so
 * the caller can tell the GM which one went missing instead of silently
 * opening something else. A stale in-session choice is not reported by
 * default: switching campaigns leaves one behind as a matter of course, and
 * that is not worth interrupting a live game over.
 */
export function resolveEncounterSelection({
  scenarios = [],
  requestedId = '',
  gmSelectedId = '',
  rememberedId = '',
  allowRemembered = false,
  reportMissingSelection = false,
} = {}) {
  const available = safeArray(scenarios).filter(item => item && item.id);
  const has = id => Boolean(id) && available.some(item => item.id === id);
  const fallback = nextPreparedEncounterId(available);

  const isLegacy = id => available.find(item => item.id === id)?.legacy === true;

  if (requestedId) {
    if (has(requestedId)) return { id: requestedId, reason: 'requested', missingRequest: '' };
    // A request is a deliberate event. If its target was deleted between the
    // source screen and Review, choosing either the previous selection or the
    // ranked default would disguise the failure as a successful handoff.
    return { id: '', reason: 'missing-request', missingRequest: requestedId };
  }
  // A choice the GM made in this session stands, archived or not: they can
  // see what they picked.
  if (has(gmSelectedId)) return { id: gmSelectedId, reason: 'gm-selected', missingRequest: '' };
  if (reportMissingSelection && gmSelectedId) {
    return { id: '', reason: 'missing-selection', missingRequest: gmSelectedId };
  }
  // A remembered one is different. Nobody chose it just now, so an archived
  // encounter must not come back on its own.
  if (allowRemembered && rememberedId) {
    if (has(rememberedId) && !isLegacy(rememberedId)) {
      return { id: rememberedId, reason: 'remembered', missingRequest: '' };
    }
    if (!has(rememberedId)) {
      return { id: '', reason: 'missing-remembered', missingRequest: rememberedId };
    }
    // A legacy target still exists, but is intentionally ineligible for
    // automatic restoration. Continue to the current prepared ranking.
  }

  // Which absent id, if any, is worth naming to the GM.
  return { id: fallback, reason: fallback ? 'next' : 'none', missingRequest: '' };
}
