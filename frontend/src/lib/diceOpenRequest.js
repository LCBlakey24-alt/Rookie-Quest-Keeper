/**
 * A Home/rail dice request can precede React.lazy's FloatingDiceRoller mount.
 * Keep one transient, route-scoped UI request until that listener arrives.
 * No user data, dice roll or character state is stored here.
 */
export const DICE_OPEN_EVENT = 'rq-dice-open';

let pendingRoute = null;

function currentRoute() {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

export function requestDiceOpen(route = currentRoute()) {
  pendingRoute = String(route || '');
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DICE_OPEN_EVENT));
}

export function consumePendingDiceOpen(route = currentRoute()) {
  if (pendingRoute === null) return false;
  const matches = pendingRoute === String(route || '');
  pendingRoute = null;
  return matches;
}
