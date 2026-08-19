import apiClient from '@/lib/apiClient';
import {
  getOfflineCacheKey,
  getOfflineCampaignPackMetadata,
  removeOfflineCampaignPack,
  saveOfflineCampaignPackMetadata,
  storeOfflineApiResponse,
} from '@/offline/offlineApiCache';

export const OFFLINE_PACK_VERSION = 1;

function requestList(campaignId) {
  const root = `/campaigns/${campaignId}`;
  return [
    { key: 'campaign', label: 'Campaign', url: root, required: true },
    { key: 'setting', label: 'World & setting', url: `${root}/setting` },
    { key: 'environment', label: 'Environment', url: `${root}/environment` },
    { key: 'rules', label: 'Campaign rules', url: `${root}/custom-rules` },
    { key: 'quests', label: 'Quests', url: `${root}/quests` },
    { key: 'npcs', label: 'NPCs', url: `${root}/npcs` },
    { key: 'locations', label: 'Locations', url: `${root}/locations` },
    { key: 'maps', label: 'Maps', url: `${root}/maps` },
    { key: 'encounters', label: 'Encounters', url: `${root}/combat-scenarios` },
    { key: 'party', label: 'Party', url: `${root}/live-party` },
    { key: 'legacy-party', label: 'Legacy party', url: `${root}/players` },
    { key: 'live-state', label: 'Live state', url: `${root}/live-state` },
    { key: 'notes', label: 'GM notes', url: `${root}/ingame-notes` },
    { key: 'inventory', label: 'Loot & rewards', url: `${root}/inventory` },
    { key: 'handouts', label: 'Handouts', url: `${root}/handouts` },
    { key: 'handout-recipients', label: 'Handout recipients', url: `${root}/handout-recipients` },
    { key: 'powers', label: 'Factions & powers', url: `${root}/gods` },
    { key: 'timeline', label: 'Timeline', url: `${root}/timeline` },
    { key: 'calendar', label: 'Calendar', url: `${root}/calendar` },
    { key: 'calendar-events', label: 'Calendar events', url: `${root}/calendar-events` },
  ];
}

function isOfflineResponse(response) {
  return Boolean(response?.rqkOffline || response?.headers?.['x-rqk-offline-cache'] === '1');
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractCharacterIds(partyPayload, legacyPartyPayload) {
  const party = Array.isArray(partyPayload) ? partyPayload : [];
  const legacy = Array.isArray(legacyPartyPayload) ? legacyPartyPayload : [];
  const fromParty = party.map(player => {
    if (player?.character_id) return player.character_id;
    if (player?.source === 'character' || player?.source === 'linked-character') return player.id;
    return null;
  });
  const fromLegacy = legacy.map(player => player?.character_id || null);
  return unique([...fromParty, ...fromLegacy].map(value => value ? String(value) : ''));
}

function sectionResult(request, status, extra = {}) {
  return {
    key: request.key,
    label: request.label,
    url: request.url,
    status,
    required: Boolean(request.required),
    ...extra,
  };
}

async function fetchAndPin(request) {
  const response = await apiClient.get(request.url, { timeout: 30000 });
  if (isOfflineResponse(response)) {
    const error = new Error('Only an older offline copy was available.');
    error.code = 'RQK_OFFLINE_FALLBACK';
    throw error;
  }
  const recordKey = await storeOfflineApiResponse(response.config || { method: 'get', url: request.url }, response);
  return {
    response,
    recordKey: recordKey || getOfflineCacheKey(response.config || { method: 'get', url: request.url }),
  };
}

export async function downloadCampaignOfflinePack(campaignId, options = {}) {
  if (!campaignId) throw new Error('Campaign id is required.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Reconnect before downloading or refreshing an offline campaign.');
  }

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const sections = [];
  const recordKeys = [];
  const payloads = {};
  const requests = requestList(campaignId);
  const totalBase = requests.length;
  let completed = 0;

  for (const request of requests) {
    onProgress({ phase: 'campaign', completed, total: totalBase, label: request.label });
    try {
      const { response, recordKey } = await fetchAndPin(request);
      payloads[request.key] = response.data;
      if (recordKey) recordKeys.push(recordKey);
      sections.push(sectionResult(request, 'saved', { savedAt: Date.now() }));
    } catch (error) {
      sections.push(sectionResult(request, 'unavailable', {
        message: error?.response?.data?.detail || error?.message || 'Could not download this section.',
      }));
      if (request.required) {
        throw new Error(error?.response?.data?.detail || `Could not download ${request.label}.`);
      }
    }
    completed += 1;
  }

  const characterIds = extractCharacterIds(payloads.party, payloads['legacy-party']);
  let characterCompleted = 0;
  for (const characterId of characterIds) {
    const request = {
      key: `character:${characterId}`,
      label: 'Character sheet',
      url: `/characters/${characterId}`,
    };
    onProgress({
      phase: 'characters',
      completed: characterCompleted,
      total: characterIds.length,
      label: `Character ${characterCompleted + 1} of ${characterIds.length}`,
    });
    try {
      const { recordKey } = await fetchAndPin(request);
      if (recordKey) recordKeys.push(recordKey);
      sections.push(sectionResult(request, 'saved', { savedAt: Date.now() }));
    } catch (error) {
      sections.push(sectionResult(request, 'unavailable', {
        message: error?.response?.data?.detail || error?.message || 'Could not download character sheet.',
      }));
    }
    characterCompleted += 1;
  }

  const failedSections = sections.filter(section => section.status !== 'saved');
  const metadata = await saveOfflineCampaignPackMetadata({
    version: OFFLINE_PACK_VERSION,
    campaignId: String(campaignId),
    campaignName: payloads.campaign?.name || options.campaignName || 'Campaign',
    savedAt: Date.now(),
    recordKeys: unique(recordKeys),
    sections,
    characterIds,
    successfulSections: sections.length - failedSections.length,
    failedSections: failedSections.length,
    complete: failedSections.length === 0,
    mediaIncluded: false,
  });

  onProgress({ phase: 'done', completed: sections.length, total: sections.length, label: 'Offline copy ready' });
  return metadata;
}

export async function getCampaignOfflinePack(campaignId) {
  return getOfflineCampaignPackMetadata(campaignId);
}

export async function deleteCampaignOfflinePack(campaignId) {
  return removeOfflineCampaignPack(campaignId);
}

export function formatOfflinePackAge(savedAt) {
  const timestamp = Number(savedAt || 0);
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
