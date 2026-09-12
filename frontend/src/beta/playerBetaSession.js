const BETA_CREDENTIALS_KEY = 'rqk.playerBeta.credentials.v1';

const BETA_HOST_RE = /^rookie-quest-keeper-git-player-be-[a-z0-9]+-lewis-blakeys-projects\.vercel\.app$/i;

export function isPlayerBeta(hostname = typeof window === 'undefined' ? '' : window.location.hostname) {
  return BETA_HOST_RE.test(String(hostname || '').trim());
}

function randomId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, '');
  } catch {}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function validCredentials(value) {
  return value && typeof value === 'object'
    && /^[A-Za-z0-9_-]{3,24}$/.test(String(value.username || ''))
    && String(value.password || '').length >= 8;
}

export function readBetaCredentials(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(BETA_CREDENTIALS_KEY) || 'null');
    return validCredentials(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function createBetaCredentials(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const suffix = randomId().slice(0, 12);
  const credentials = {
    username: `Beta_${suffix}`,
    password: `RqkBeta-${randomId()}!`,
  };
  try { storage?.setItem(BETA_CREDENTIALS_KEY, JSON.stringify(credentials)); } catch {}
  return credentials;
}

function sessionFromResponse(response, fallbackUsername = '') {
  const token = response?.data?.token || response?.data?.access_token || '';
  const username = response?.data?.username || fallbackUsername;
  if (!token) throw new Error('The beta session did not return an access token.');
  return { token, username };
}

export async function ensurePlayerBetaSession(apiClient, {
  storage = typeof localStorage === 'undefined' ? null : localStorage,
  existingToken = '',
} = {}) {
  if (!apiClient) throw new Error('Player Beta could not start because the API client is unavailable.');

  if (existingToken) {
    try {
      const response = await apiClient.get('/auth/me');
      return { token: existingToken, username: response?.data?.username || 'Beta player' };
    } catch {
      // The normal API response interceptor clears expired/invalid tokens.
    }
  }

  let credentials = readBetaCredentials(storage);
  if (credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return sessionFromResponse(response, credentials.username);
    } catch (error) {
      if (error?.response?.status && error.response.status !== 401) throw error;
      credentials = null;
    }
  }

  credentials = createBetaCredentials(storage);
  try {
    const response = await apiClient.post('/auth/register', credentials);
    return sessionFromResponse(response, credentials.username);
  } catch (error) {
    // If the registration reached the server but the response was lost, a retry
    // can safely recover by attempting the same credentials once.
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return sessionFromResponse(response, credentials.username);
    } catch {
      throw error;
    }
  }
}

export { BETA_CREDENTIALS_KEY };
