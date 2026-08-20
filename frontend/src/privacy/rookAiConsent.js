import apiClient from '@/lib/apiClient';

export const ROOK_AI_CONSENT_KEY = 'rqk.aiDataConsent';

export function getRookAiConsent() {
  try { return localStorage.getItem(ROOK_AI_CONSENT_KEY) || ''; } catch { return ''; }
}

export function grantRookAiConsent() {
  try { localStorage.setItem(ROOK_AI_CONSENT_KEY, 'granted'); } catch {}
  try { window.dispatchEvent(new CustomEvent('rqk:rook-ai-consent-changed')); } catch {}
}

export function revokeRookAiConsent() {
  try { localStorage.removeItem(ROOK_AI_CONSENT_KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent('rqk:rook-ai-consent-changed')); } catch {}
}

function requiresExternalAiConsent(config = {}) {
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'get') return false;
  const url = String(config.url || '');

  if (url === '/rook/draft/save') return false;
  return url === '/rook/draft'
    || url.startsWith('/rook/generate')
    || url.startsWith('/unseen-servant/generate')
    || url.startsWith('/ai/');
}

export function ensureRookAiConsent() {
  if (getRookAiConsent() === 'granted') return true;
  if (typeof window === 'undefined') return false;

  const allowed = window.confirm(
    'Use Rook AI?\n\nRook sends your request and relevant saved campaign context to OpenAI to generate the response. Passwords are not included.\n\nChoose OK to allow Rook AI on this device. You can revoke this later in Account Settings.'
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
