export const ANALYTICS_KEY = 'rqk.analyticsConsent';

export function getAnalyticsConsent() {
  try { return localStorage.getItem(ANALYTICS_KEY) || ''; } catch { return ''; }
}

// Opt-out must stop a running tracker *before* removing local permission.
export function setAnalyticsConsent(value) {
  if (value !== 'granted') {
    try { window.posthog?.stopSessionRecording?.(); } catch {}
    try { window.posthog?.opt_out_capturing?.(); } catch {}
    try { window.posthog?.reset?.(); } catch {}
  }
  try {
    if (value === 'granted') localStorage.setItem(ANALYTICS_KEY, 'granted');
    else localStorage.removeItem(ANALYTICS_KEY);
  } catch {}
  try { window.dispatchEvent(new CustomEvent('rqk:analytics-consent-changed')); } catch {}
}
