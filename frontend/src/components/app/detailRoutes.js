/**
 * Which routes are a working surface rather than a list.
 *
 * On a list page the labelled rail is the main way around the app. On a
 * working surface -- one campaign or one character sheet -- the page
 * already has its own navigation, and the rail is
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

function normalise(pathname) {
  const value = String(pathname || '').split('?')[0].split('#')[0];
  return value.length > 1 ? value.replace(/\/+$/, '') : value;
}

export function isDetailRoute(pathname) {
  const path = normalise(pathname);
  if (!path || path === '/') return false;

  // A trailing segment is required, so a list page keeps the full rail.
  return DETAIL_PARENTS.some((parent) => path.startsWith(parent + '/') && path.length > parent.length + 1);
}
