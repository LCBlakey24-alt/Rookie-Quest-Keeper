import apiClient from '@/lib/apiClient';
import { getStoredAuthUsername } from '@/lib/auth';

// The legacy unscoped key must never be accepted for a different account on
// a shared device. Existing users are prompted once again after this change.
export const ROOK_AI_CONSENT_KEY = 'rqk.aiDataConsent';

function currentConsentKey() {
  const username = String(getStoredAuthUsername() || '').trim().toLowerCase();
  return username
    ? `${ROOK_AI_CONSENT_KEY}:account:${encodeURIComponent(username)}`
    : null;
}

function announceConsentChange() {
  try { window.dispatchEvent(new CustomEvent('rqk:rook-ai-consent-changed')); } catch {}
}

function cacheConsent(granted) {
  const key = currentConsentKey();
  if (!key) return;
  let changed = false;
  try {
    const previous = localStorage.getItem(key) === 'granted';
    changed = previous !== granted;
    if (granted) localStorage.setItem(key, 'granted');
    else localStorage.removeItem(key);
    // A legacy device-wide choice is never authoritative for another account.
    localStorage.removeItem(ROOK_AI_CONSENT_KEY);
  } catch {}
  if (changed) announceConsentChange();
}

export function getRookAiConsent() {
  const key = currentConsentKey();
  if (!key) return '';
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}

export function clearCachedRookAiConsent() {
  const key = currentConsentKey();
  try {
    if (key) localStorage.removeItem(key);
    localStorage.removeItem(ROOK_AI_CONSENT_KEY);
  } catch {}
  announceConsentChange();
}

export async function refreshRookAiConsent() {
  if (!currentConsentKey()) {
    return { granted: false, required: true, policy_version: null, updated_at: null };
  }
  const response = await apiClient.get('/auth/ai-consent');
  const status = response?.data || {};
  cacheConsent(status.granted === true);
  return status;
}

async function updateRookAiConsent(granted) {
  if (!currentConsentKey()) throw new Error('Sign in before changing Rook AI permission.');
  const response = await apiClient.put('/auth/ai-consent', { granted });
  const status = response?.data || {};
  if (status.granted !== granted) {
    throw new Error('Rook AI permission could not be verified.');
  }
  cacheConsent(status.granted === true);
  return status;
}

export function grantRookAiConsent() {
  return updateRookAiConsent(true);
}

export function revokeRookAiConsent() {
  return updateRookAiConsent(false);
}

// Every route that can submit content to an external AI provider must obtain
// informed permission. Match the URL pathname, not a query string or fragment.
export function requiresExternalAiConsent(config = {}) {
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'get' || method === 'head' || method === 'options') return false;
  const rawUrl = String(config.url || '');
  const pathname = rawUrl.split(/[?#]/, 1)[0];
  if (pathname === '/rook/draft/save') return false; // local draft save only

  return pathname.startsWith('/rook/')
    || pathname.startsWith('/unseen-servant/generate')
    || pathname.startsWith('/ai/')
    || pathname.startsWith('/character-import/extract')
    || pathname === '/homebrew/parse-docx'
    || pathname === '/homebrew/parse-text'
    || pathname === '/homebrew/complete-draft'
    || /^\/campaigns\/[^/]+\/npcs\/generate$/.test(pathname)
    || /^\/campaigns\/[^/]+\/session-recaps$/.test(pathname);
}

export async function ensureRookAiConsent() {
  const serverStatus = await refreshRookAiConsent();
  if (serverStatus.granted === true) return true;
  if (typeof window === 'undefined') return false;

  const allowed = window.confirm(
    'Allow Rook AI?\n\nWhen you use AI features, your prompt, relevant saved campaign context and any selected files may be sent to OpenAI for processing. Do not include private information about others without permission.\n\nChoose OK to allow this processing on this device. You can revoke permission later in Account Settings.'
  );
  if (!allowed) return false;
  await grantRookAiConsent();
  return true;
}

let installed = false;

export function installRookAiConsentGate() {
  if (installed || !apiClient?.interceptors?.request) return;
  installed = true;

  apiClient.interceptors.request.use(async config => {
    if (!requiresExternalAiConsent(config)) return config;
    if (await ensureRookAiConsent()) return config;

    const error = new Error('Rook AI request cancelled. External AI consent was not granted.');
    error.code = 'RQK_AI_CONSENT_CANCELLED';
    return Promise.reject(error);
  });
}
