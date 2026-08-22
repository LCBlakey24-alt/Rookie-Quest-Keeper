import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { clearAuthToken, getAuthToken } from '@/lib/auth';
import { readOfflineApiResponse, storeOfflineApiResponse } from '@/offline/offlineApiCache';

import { formatApiErrorDetail } from '@/lib/apiErrors';

const CHARACTER_PUT_ONLY_FIELDS = new Set([
  'spell_slots_remaining',
]);

const LEGACY_ACCOUNT_ROUTES = {
  'get:/account/profile': { method: 'get', url: '/auth/me' },
  'put:/account/update': { method: 'patch', url: '/auth/me' },
  'post:/account/change-password': { method: 'post', url: '/auth/change-password' },
  'delete:/account/delete': { method: 'delete', url: '/auth/me' },
};

function parseBody(data) {
  if (!data) return {};
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return {}; }
  }
  return typeof data === 'object' ? data : {};
}

function shouldUseCharacterPut(config) {
  const method = String(config?.method || '').toLowerCase();
  const url = String(config?.url || '');
  if (method !== 'patch') return false;
  if (!/^\/characters\/[^/]+$/.test(url)) return false;

  const body = parseBody(config.data);
  return Object.keys(body).some(key => CHARACTER_PUT_ONLY_FIELDS.has(key));
}

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

function isAuthProbeNetworkFailure(error) {
  const url = String(error?.config?.url || '');
  return url === '/auth/me' && !error?.response;
}

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

apiClient.interceptors.request.use((incomingConfig) => {
  let config = applyLegacyApiCompatibility(incomingConfig);
  config = applyLoginTimeoutPolicy(config);
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (shouldUseCharacterPut(config)) {
    config.method = 'put';
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
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

export default apiClient;