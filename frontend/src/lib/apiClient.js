import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { clearAuthToken, getAuthToken } from '@/lib/auth';

import { formatApiErrorDetail } from '@/lib/apiErrors';

const CHARACTER_PUT_ONLY_FIELDS = new Set([
  'spell_slots_remaining',
]);

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

function isAuthProbeNetworkFailure(error) {
  const url = String(error?.config?.url || '');
  return url === '/auth/me' && !error?.response;
}

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (shouldUseCharacterPut(config)) {
    config.method = 'put';
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.data?.detail) {
      error.formattedDetail = formatApiErrorDetail(error.response.data.detail);
    }

    // /auth/me is an online validity probe, not the source of the local
    // installed-app session. A network outage must not eject a player or GM
    // from an already signed-in PWA/desktop shell. A real 401 still clears it.
    if (isAuthProbeNetworkFailure(error)) {
      return Promise.resolve({
        data: { offline: true },
        status: 200,
        statusText: 'Offline',
        headers: {},
        config: error.config,
      });
    }

    if (error?.response?.status === 401) {
      clearAuthToken();
      localStorage.removeItem('dm_username');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
