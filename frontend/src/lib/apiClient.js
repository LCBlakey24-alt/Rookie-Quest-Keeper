import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { clearAuthToken, getAuthToken } from '@/lib/auth';

import { formatApiErrorDetail } from '@/lib/apiErrors';
import { isLocalPreview } from '@/preview/previewMode';

const LEGACY_ACCOUNT_ROUTES = {
  'get:/account/profile': { method: 'get', url: '/auth/me' },
  'put:/account/update': { method: 'patch', url: '/auth/me' },
  'post:/account/change-password': { method: 'post', url: '/auth/change-password' },
  'delete:/account/delete': { method: 'delete', url: '/auth/me' },
};

export const LOGIN_TIMEOUT_MS = 30000;
const BACKEND_WAKE_TIMEOUT_MS = 10000;
const BACKEND_WAKE_FRESH_MS = 2 * 60 * 1000;
const BACKEND_WAKE_RETRY_DELAY_MS = 1500;

let wakeInFlight = null;
let lastSuccessfulWakeAt = 0;

export function applyLegacyApiCompatibility(config = {}) {
  const key = `${String(config.method || 'get').toLowerCase()}:${String(config.url || '')}`;
  const replacement = LEGACY_ACCOUNT_ROUTES[key];
  if (!replacement) return config;
  return { ...config, method: replacement.method, url: replacement.url };
}

export function applyLoginTimeoutPolicy(config = {}) {
  if (String(config.url || '') !== '/auth/login') return config;
  return { ...config, timeout: LOGIN_TIMEOUT_MS };
}

function parseRequestData(data) {
  if (!data || typeof data === 'object') return data || {};
  if (typeof data !== 'string') return {};
  try {
    return JSON.parse(data) || {};
  } catch {
    return {};
  }
}

export function shouldUseOfflineCache(config = {}) {
  const method = String(config.method || 'get').toLowerCase();
  if (method !== 'get') return false;

  const url = String(config.url || '').split('?')[0];
  if (!url || url === '/auth/me' || url.startsWith('/auth/') || url.startsWith('/admin') || url.startsWith('/rook')) {
    return false;
  }

  return true;
}

export async function applyCharacterCreationReadinessPolicy(config = {}, storage) {
  const method = String(config.method || 'get').toLowerCase();
  const url = String(config.url || '');
  if (method !== 'post' || url !== '/characters') return config;

  const payload = parseRequestData(config.data);
  if (payload.creation_mode !== 'full' || Number(payload.level || 1) <= 1) return config;

  const {
    readHigherLevelCreationSelections,
    validateHigherLevelCharacterCreation,
  } = await import('@/data/startingLevelRequestValidation');
  const { levelChoices, detailChoices } = readHigherLevelCreationSelections(storage);
  const readiness = validateHigherLevelCharacterCreation({ payload, levelChoices, detailChoices });
  if (readiness.ready) return config;

  const firstBlockers = readiness.blockers.slice(0, 3);
  const remaining = readiness.blockers.length - firstBlockers.length;
  const message = [
    'Complete the required starting-level choices before creating this character.',
    ...firstBlockers,
    remaining > 0 ? `Plus ${remaining} more required choice${remaining === 1 ? '' : 's'}.` : '',
  ].filter(Boolean).join(' ');
  const error = new Error(message);
  error.formattedDetail = message;
  error.rqkValidation = true;
  error.validationBlockers = readiness.blockers;
  throw error;
}

export function wakeBackend({ force = false } = {}) {
  if (isLocalPreview()) return Promise.resolve(false);
  if (typeof fetch !== 'function') return Promise.resolve(false);

  const now = Date.now();
  if (!force && lastSuccessfulWakeAt && now - lastSuccessfulWakeAt < BACKEND_WAKE_FRESH_MS) {
    return Promise.resolve(true);
  }
  if (wakeInFlight) return wakeInFlight;

  wakeInFlight = (async () => {
    const supportsAbort = typeof AbortController !== 'undefined';
    const controller = supportsAbort ? new AbortController() : null;
    const timeoutId = typeof window !== 'undefined'
      ? window.setTimeout(() => controller?.abort(), BACKEND_WAKE_TIMEOUT_MS)
      : null;

    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        cache: 'no-store',
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (response.ok) lastSuccessfulWakeAt = Date.now();
      return response.ok;
    } catch {
      return false;
    } finally {
      if (timeoutId !== null && typeof window !== 'undefined') window.clearTimeout(timeoutId);
      wakeInFlight = null;
    }
  })();

  return wakeInFlight;
}

function warmBackend({ retry = false } = {}) {
  wakeBackend().then((ready) => {
    if (!ready && retry && typeof window !== 'undefined') {
      window.setTimeout(() => {
        wakeBackend({ force: true });
      }, BACKEND_WAKE_RETRY_DELAY_MS);
    }
  });
}

function isAuthProbeNetworkFailure(error) {
  const url = String(error?.config?.url || '');
  return url === '/auth/me' && !error?.response;
}

function isLoginNetworkFailure(error) {
  return String(error?.config?.url || '') === '/auth/login' && !error?.response;
}

function isRequestTimeout(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code === 'ECONNABORTED' || code === 'ETIMEDOUT' || message.includes('timeout');
}

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

apiClient.interceptors.request.use(async (incomingConfig) => {
  let config = applyLegacyApiCompatibility(incomingConfig);
  config = applyLoginTimeoutPolicy(config);
  config = await applyCharacterCreationReadinessPolicy(config);

  // The isolated preview transport is substantial and is only ever needed on
  // local preview hosts. Keep it out of ordinary/public startup bundles.
  if (isLocalPreview()) {
    const { previewAdapter } = await import('@/preview/previewTransport');
    return { ...config, adapter: previewAdapter };
  }

  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (isLocalPreview()) return response;

    // IndexedDB/offline support is valuable once signed-in data is being read,
    // but it should not be part of public/auth startup. Load it after a cache-
    // eligible response has already completed so it never delays the request.
    if (shouldUseOfflineCache(response.config)) {
      import('@/offline/offlineApiCache')
        .then(({ storeOfflineApiResponse }) => storeOfflineApiResponse(response.config, response))
        .catch(() => {});
    }
    return response;
  },
  async (error) => {
    if (error?.response?.data?.detail) {
      error.formattedDetail = formatApiErrorDetail(error.response.data.detail);
    } else if (isLoginNetworkFailure(error)) {
      error.formattedDetail = isRequestTimeout(error)
        ? 'The server is taking longer than expected to respond. It may still be waking up. Please try signing in again in a moment.'
        : 'Could not reach the Rookie Quest Keeper server. Check your connection and try signing in again.';
    }

    // /auth/me is an online validity probe, not the source of the local
    // installed-app session. A network outage must not eject a player or GM
    // from an already signed-in PWA/desktop shell. A real 401 still clears it.
    if (isAuthProbeNetworkFailure(error)) {
      return {
        data: { offline: true },
        status: 200,
        statusText: 'Offline',
        headers: {},
        config: error.config,
      };
    }

    // GET-only offline fallback. Mutations still fail normally: they will not
    // be queued until the dedicated sync/conflict layer is implemented. Import
    // the IndexedDB transport only if this request can actually use it.
    if (!error?.response && error?.config && shouldUseOfflineCache(error.config)) {
      const { readOfflineApiResponse } = await import('@/offline/offlineApiCache');
      const cached = await readOfflineApiResponse(error.config).catch(() => null);
      if (cached) {
        try {
          window.dispatchEvent(new CustomEvent('rqk:offline-cache-hit', {
            detail: { url: error.config.url, savedAt: cached.rqkOfflineSavedAt },
          }));
        } catch {}
        return cached;
      }
    }

    if (error?.response?.status === 401) {
      const authorization = error.config?.headers?.Authorization;
      const currentToken = getAuthToken();
      // Failed sign-in and late requests from an old account must not clear a
      // newer session. clearAuthToken also notifies the mounted route gate.
      if (currentToken && authorization === `Bearer ${currentToken}`) clearAuthToken();
    }
    return Promise.reject(error);
  }
);

// Free/sleeping hosts can take longer than an ordinary API request to wake.
// Start the wake-up while the user is still reading the landing/auth UI, then
// re-check when a phone or browser returns to the app after being idle. Calls
// are deduplicated and fresh successful wakes are reused so this stays cheap.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  window.setTimeout(() => {
    warmBackend({ retry: true });
  }, 0);

  window.addEventListener('focus', () => {
    warmBackend();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') warmBackend();
  });
}

export default apiClient;
