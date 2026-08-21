import apiClient from '@/lib/apiClient';
import { clearCurrentOfflineAccountData } from '@/offline/offlineApiCache';
import { clearOfflineMediaCache } from '@/offline/offlineMediaCache';
import { revokeRookAiConsent } from '@/privacy/rookAiConsent';

const ANALYTICS_KEY = 'rqk.analyticsConsent';
let installed = false;

function isAccountDeleteResponse(response) {
  const method = String(response?.config?.method || '').toLowerCase();
  const url = String(response?.config?.url || '');
  return method === 'delete' && url === '/auth/me';
}

export async function clearDeletedAccountDeviceData() {
  // These run while the auth token still exists so account-scoped cache/media
  // names can be resolved correctly. A local cleanup failure must never turn a
  // successful server-side account deletion into a failed delete response.
  await Promise.allSettled([
    clearCurrentOfflineAccountData(),
    clearOfflineMediaCache(),
  ]);
  revokeRookAiConsent();
  try { localStorage.removeItem(ANALYTICS_KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent('rqk:analytics-consent-changed')); } catch {}
}

export function installAccountDeletionLocalCleanup() {
  if (installed || !apiClient?.interceptors?.response) return;
  installed = true;
  apiClient.interceptors.response.use(async response => {
    if (isAccountDeleteResponse(response)) {
      await clearDeletedAccountDeviceData();
    }
    return response;
  });
}
