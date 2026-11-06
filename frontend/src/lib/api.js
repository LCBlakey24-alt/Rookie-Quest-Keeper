const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

// Production traffic stays on the public Rookie Quest Keeper origin and is
// proxied by Vercel to the backend. This avoids baking a stale backend host
// into browser bundles and keeps auth/API requests same-origin for players.
const shouldUseSameOriginApi =
  process.env.NODE_ENV === 'production' && typeof window !== 'undefined';

const configuredBackendUrl = trimTrailingSlash(
  shouldUseSameOriginApi
    ? window.location.origin
    : (process.env.REACT_APP_BACKEND_URL || window.location.origin)
);

export const BACKEND_URL = configuredBackendUrl.endsWith('/api')
  ? configuredBackendUrl.slice(0, -4) || window.location.origin
  : configuredBackendUrl;

export const API_BASE = configuredBackendUrl.endsWith('/api')
  ? configuredBackendUrl
  : `${configuredBackendUrl}/api`;

// The live campaign socket cannot use the same-origin path: Vercel rewrites
// only /api/* and cannot carry a WebSocket upgrade, so a socket to the site
// itself receives the app's HTML instead of upgrading. The browser therefore
// connects straight to the API host, which checks the page's Origin against
// its trusted list and takes credentials in the first message, never in the
// URL. Other production hosts (Vercel previews) are not on that list, so they
// get no socket at all and use the HTTP polling fallback.
const PRODUCTION_SOCKET_HOSTS = {
  'rookiequestkeeper.com': 'wss://rookie-quest-keeper-api.onrender.com',
  'www.rookiequestkeeper.com': 'wss://rookie-quest-keeper-api.onrender.com',
};

/** Base URL for live sockets (no path, no credentials), or '' for none. */
export function liveSocketBase(runtime = typeof window !== 'undefined' ? window : null) {
  const production = process.env.NODE_ENV === 'production';
  const configured = trimTrailingSlash(String(process.env.REACT_APP_LIVE_SOCKET_URL || '')).replace(/^http/i, 'ws');
  const base = configured
    || (production
      ? (PRODUCTION_SOCKET_HOSTS[String(runtime?.location?.hostname || '').toLowerCase()] || '')
      : trimTrailingSlash(String(BACKEND_URL || '')).replace(/^http/i, 'ws'));
  // Production sockets are encrypted or not opened.
  if (production && base && !base.startsWith('wss://')) return '';
  return base;
}

