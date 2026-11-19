/**
 * Open the player display for the TV.
 *
 * - One named window: clicking Open TV again reuses it instead of piling up
 *   tabs.
 * - On a laptop with an extended screen (HDMI), browsers that support the
 *   Window Management API (Chrome and Edge, after a one-time permission)
 *   move the window onto the other screen and fill it. Elsewhere it opens
 *   as a normal window you drag to the TV.
 * - The display opens with ?present=1, which shows a one-tap "Show
 *   fullscreen" button there (browsers only allow fullscreen after a tap).
 *
 * The window is opened straight away, inside the click, so pop-up blockers
 * allow it; it is moved to the TV afterwards.
 */
export const DISPLAY_WINDOW_NAME = 'rqk-player-display';

export function withPresent(url) {
  return `${url}${url.includes('?') ? '&' : '?'}present=1`;
}

/** Is there another screen to show the display on? Chrome/Edge report this without asking. */
export function hasExtendedScreen(win = typeof window !== 'undefined' ? window : undefined) {
  return Boolean(win?.screen && win.screen.isExtended);
}

/** The screen that is not the one this window is on, or null. */
export async function findOtherScreen(win = window) {
  if (!hasExtendedScreen(win) || typeof win.getScreenDetails !== 'function') return null;
  try {
    const details = await win.getScreenDetails();
    const screens = Array.isArray(details?.screens) ? details.screens : [];
    return screens.find((screen) => screen !== details.currentScreen && !screen.isInternal)
      || screens.find((screen) => screen !== details.currentScreen) || null;
  } catch {
    return null; // permission declined, or not allowed here
  }
}

/**
 * Open (or reuse) the display window. Resolves to
 * { opened, placed, screenLabel } once it has tried to move it to the TV.
 */
export async function openDisplayWindow(url, win = window) {
  const target = withPresent(url);
  const width = Math.max(960, Math.round((win.screen?.availWidth || 1280) * 0.6));
  const height = Math.max(540, Math.round((win.screen?.availHeight || 720) * 0.6));
  const popup = win.open(target, DISPLAY_WINDOW_NAME, `popup,width=${width},height=${height}`);
  if (!popup) return { opened: false, placed: false, screenLabel: '' };
  try { popup.focus(); } catch { /* another origin or closed */ }

  const other = await findOtherScreen(win);
  if (!other) return { opened: true, placed: false, screenLabel: '' };
  try {
    popup.moveTo(other.availLeft, other.availTop);
    popup.resizeTo(other.availWidth, other.availHeight);
    return { opened: true, placed: true, screenLabel: other.label || 'your second screen' };
  } catch {
    return { opened: true, placed: false, screenLabel: '' };
  }
}

/** Open the display and tell the GM what happened, in plain words. */
export async function openDisplayAndReport(url, toast, win = window) {
  const result = await openDisplayWindow(url, win);
  if (!result.opened) {
    toast.error('The display window was blocked. Allow pop-ups for this site, then try again.');
  } else if (result.placed) {
    toast.success(`Display opened on ${result.screenLabel}`, { description: 'Tap “Show fullscreen” on the TV window (or press F there).' });
  } else if (hasExtendedScreen(win)) {
    toast.info('Display opened in a new window', { description: 'Drag it onto your TV, then tap “Show fullscreen” (or press F).' });
  } else {
    toast.info('Display opened in a new window', { description: 'On a TV with HDMI, set your computer to extend the display, then drag this window across.' });
  }
  return result;
}
