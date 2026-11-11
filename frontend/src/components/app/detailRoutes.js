/**
 * Which routes are a working surface rather than a list.
 *
 * On a list page the labelled rail is the main way around the app. On a
 * working surface -- one campaign, one character sheet, the homebrew
 * workshop -- the page already has its own navigation, and the rail is
 * competing with it for width. On a laptop that produced four columns side
 * by side and squashed the content people actually came for.
 *
 * So these routes get the rail as icons only. Nothing is removed: every
 * destination is still there, still reachable, still keyboard accessible,
 * and still labelled by its title and aria-label.
 */

// Each entry is a path that is a working surface once it has something
// after it: /characters is the list, /characters/<id> is a sheet.
const DETAIL_PARENTS = [
  '/campaign',
  '/campaigns',
  '/characters',
  '/combat',
  '/gm-screen',
  '/gm-second-screen',
  '/mobile',
  '/player-display',
];

// Working surfaces that have no id in the path.
const DETAIL_EXACT = [
  '/homebrew',
];

function normalise(pathname) {
  const value = String(pathname || '').split('?')[0].split('#')[0];
  return value.length > 1 ? value.replace(/\/+$/, '') : value;
}

export function isDetailRoute(pathname) {
  const path = normalise(pathname);
  if (!path || path === '/') return false;

  if (DETAIL_EXACT.includes(path)) return true;

  // A trailing segment is required, so a list page keeps the full rail.
  return DETAIL_PARENTS.some((parent) => path.startsWith(parent + '/') && path.length > parent.length + 1);
}

/**
 * Which routes are "inside" a section rather than the home dashboard.
 *
 * On a phone the home dashboard is the hub: it lists My Characters, My
 * Campaigns, Homebrew, Community and the rest. Every other page hides the
 * bottom tab bar and shows a hexagon back button in the top-left corner
 * that returns to the dashboard. Desktop and tablet keep their side rail.
 */
const HUB_ROUTES = ['/', '/home'];

export function isInnerRoute(pathname) {
  const path = normalise(pathname);
  return Boolean(path) && !HUB_ROUTES.includes(path);
}
