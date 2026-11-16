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

export function requiresExternalAiConsent(config = {}) {
  const method = String(config.method || 'get').toLowerCase();
  if (['get', 'head', 'options'].includes(method)) return false;
  const pathname = String(config.url || '').split(/[?#]/, 1)[0];

  // Draft storage is local work, not a request to an external AI provider.
  if (pathname === '/rook/draft/save') return false;
  // All Rook generation/chat/form-fill paths must be included, not just
  // /rook/generate; otherwise content can be sent without the user's choice.
  return pathname.startsWith('/rook/')
    || pathname.startsWith('/unseen-servant/generate')
    || pathname.startsWith('/ai/')
    || pathname.startsWith('/character-import/extract')
    || ['/homebrew/parse-docx', '/homebrew/parse-text', '/homebrew/complete-draft'].includes(pathname)
    || /^\/campaigns\/[^/]+\/npcs\/generate$/.test(pathname)
    || /^\/campaigns\/[^/]+\/session-recaps$/.test(pathname);
}

export function ensureRookAiConsent() {
  if (getRookAiConsent() === 'granted') return true;
  if (typeof window === 'undefined') return false;

  const allowed = window.confirm(
    'Use Rook AI?\n\nRook may send your request, relevant saved campaign context, or files you choose to process to OpenAI to generate a response or extract information. Passwords are not included.\n\nChoose OK to allow Rook AI on this device. You can revoke this later in Account Settings.'
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
