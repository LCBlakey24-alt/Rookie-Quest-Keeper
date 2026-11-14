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

export function getRookAiConsent() {
  const key = currentConsentKey();
  if (!key) return '';
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}

export function grantRookAiConsent() {
  const key = currentConsentKey();
  if (!key) return;
  try { localStorage.setItem(key, 'granted'); } catch {}
  announceConsentChange();
}

export function revokeRookAiConsent() {
  const key = currentConsentKey();
  try {
    if (key) localStorage.removeItem(key);
    localStorage.removeItem(ROOK_AI_CONSENT_KEY); // legacy, never trusted
  } catch {}
  announceConsentChange();
}

// Every route that can submit content to an external AI provider must obtain
// informed permission. Match the URL pathname, not a query string or fragment.
export function requiresExternalAiConsent(config = {}) {
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'get' || method === 'head' || method === 'options') return false;
  const rawUrl = String(config.url || '');
  const pathname = rawUrl.split(/[?#]/, 1)[0];
  if (pathname === '/rook/draft/save') return false; // local draft save only

  return pathname === '/rook/draft'
    || pathname === '/rook/chat'
    || pathname === '/rook/form-fill'
    || pathname.startsWith('/rook/generate')
    || pathname.startsWith('/unseen-servant/generate')
    || pathname.startsWith('/ai/')
    || pathname.startsWith('/character-import/extract');
}

export function ensureRookAiConsent() {
  if (getRookAiConsent() === 'granted') return true;
  if (typeof window === 'undefined') return false;

  const allowed = window.confirm(
    'Allow Rook AI?\n\nWhen you use AI features, your prompt, relevant saved campaign context and any selected files may be sent to OpenAI for processing. Do not include private information about others without permission.\n\nChoose OK to allow this processing on this device. You can revoke permission later in Account Settings.'
  );
  if (allowed) grantRookAiConsent();
  return allowed;
}

let installed = false;

export function installRookAiConsentGate() {
  if (installed || !apiClient?.interceptors?.request) return;
  installed = true;

  apiClient.interceptors.request.use(config => {
    if (!requiresExternalAiConsent(config)) return config;
    if (ensureRookAiConsent()) return config;

    const error = new Error('Rook AI request cancelled. External AI consent was not granted.');
    error.code = 'RQK_AI_CONSENT_CANCELLED';
    return Promise.reject(error);
  });
}
