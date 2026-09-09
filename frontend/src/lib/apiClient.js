import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { clearAuthToken, getAuthToken } from '@/lib/auth';
import { readOfflineApiResponse, storeOfflineApiResponse } from '@/offline/offlineApiCache';

import { formatApiErrorDetail } from '@/lib/apiErrors';

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

export async function wakeBackend() {
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

apiClient.interceptors.request.use((incomingConfig) => {
  let config = applyLegacyApiCompatibility(incomingConfig);
  config = applyLoginTimeoutPolicy(config);
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

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

// Free/sleeping hosts can take longer than the old login timeout to wake.
// Start that wake-up as soon as the frontend bundle loads, while the user is
// still reading the landing/auth UI. This is deliberately fire-and-forget.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  window.setTimeout(() => {
    wakeBackend();
  }, 0);
}

export default apiClient;
