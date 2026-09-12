import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { clearAuthToken, getAuthToken } from '@/lib/auth';
import { readOfflineApiResponse, storeOfflineApiResponse } from '@/offline/offlineApiCache';

import { formatApiErrorDetail } from '@/lib/apiErrors';
import { isLocalPreview } from '@/preview/previewMode';
import { previewAdapter } from '@/preview/previewTransport';

const LEGACY_ACCOUNT_ROUTES = {
  'get:/account/profile': { method: 'get', url: '/auth/me' },
  'put:/account/update': { method: 'patch', url: '/auth/me' },
  'post:/account/change-password': { method: 'post', url: '/auth/change-password' },
  'delete:/account/delete': { method: 'delete', url: '/auth/me' },
};

export function applyLegacyApiCompatibility(config = {}) {
  const key = `${String(config.method || 'get').toLowerCase()}:${String(config.url || '')}`;
  const replacement = LEGACY_ACCOUNT_ROUTES[key];
  if (!replacement) return config;
  return { ...config, method: replacement.method, url: replacement.url };
}

export function applyLoginTimeoutPolicy(config = {}) {
  if (String(config.url || '') !== '/auth/login') return config;
  return { ...config, timeout: 0 };
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

export async function wakeBackend() {
  if (isLocalPreview()) return false;
  if (typeof fetch !== 'function') return false;
  try {
    await fetch(`${API_BASE}/health`, { method: 'GET', cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}

function isAuthProbeNetworkFailure(error) {
  const url = String(error?.config?.url || '');
  return url === '/auth/me' && !error?.response;
}

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

apiClient.interceptors.request.use(async (incomingConfig) => {
  let config = applyLegacyApiCompatibility(incomingConfig);
  config = applyLoginTimeoutPolicy(config);
  config = await applyCharacterCreationReadinessPolicy(config);
  if (isLocalPreview()) return { ...config, adapter: previewAdapter };
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (isLocalPreview()) return response;
    storeOfflineApiResponse(response.config, response).catch(() => {});
    return response;
  },
  async (error) => {
    if (error?.response?.data?.detail) {
      error.formattedDetail = formatApiErrorDetail(error.response.data.detail);
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
    // be queued until the dedicated sync/conflict layer is implemented.
    if (!error?.response && error?.config) {
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
      clearAuthToken();
      localStorage.removeItem('dm_username');
    }
    return Promise.reject(error);
  }
);

// Free/sleeping hosts can take longer than the old login timeout to wake.
// Start that wake-up as soon as the frontend bundle loads, while the user is
// still reading the landing/auth UI. This is deliberately fire-and-forget.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  window.setTimeout(() => {
    wakeBackend();
  }, 0);
}

export default apiClient;