import { validTabIds } from './campaignDashboardTabs';

/**
 * A campaign is chosen before the GM selects a working mode.
 * The entry route shows the mode selector, while named creation links and
 * existing deep links continue straight into the preparation workspace.
 */
export function campaignModeRoute(campaignId) {
  return `/campaign/${encodeURIComponent(String(campaignId || ''))}`;
}

export function campaignCreationRoute(campaignId, tabId = '') {
  const tab = validTabIds.has(tabId) ? `#tab-${tabId}` : '';
  return `${campaignModeRoute(campaignId)}?mode=creation${tab}`;
}

export function isCreationModeLocation(search = '', hash = '') {
  if (new URLSearchParams(search).get('mode') === 'creation') return true;
  // Existing saved links to a specific campaign tool must never be stranded
  // at a new chooser just because they predate the mode-based interface.
  const tab = String(hash || '').replace(/^#tab-/, '').replace(/^#/, '');
  return validTabIds.has(tab);
}
