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
