import apiClient from '@/lib/apiClient';
import {
  getOfflineCacheKey,
  getOfflineCampaignPackMetadata,
  listOfflineCampaignPacks,
  removeOfflineCampaignPack,
  saveOfflineCampaignPackMetadata,
  storeOfflineApiResponse,
} from '@/offline/offlineApiCache';
import {
  cacheOfflineMediaUrls,
  extractOfflineMediaUrls,
  removeOfflineMediaUrls,
} from '@/offline/offlineMediaCache';

export const OFFLINE_PACK_VERSION = 2;

export function buildGmOfflinePackRequests(campaignId) {
  const root = `/campaigns/${campaignId}`;
  return [
    { key: 'campaign', label: 'Campaign', url: root, required: true },
    { key: 'setting', label: 'World & setting', url: `${root}/setting` },
    { key: 'world-setting', label: 'World tone', url: `${root}/world-setting` },
    { key: 'environment', label: 'Environment', url: `${root}/environment` },
    { key: 'rules', label: 'Campaign rules', url: `${root}/custom-rules` },
    { key: 'content', label: 'Character options', url: `${root}/content` },
    { key: 'quests', label: 'Quests', url: `${root}/quests` },
    { key: 'story-arcs', label: 'Story arcs', url: `${root}/story-arcs` },
    { key: 'npcs', label: 'NPCs', url: `${root}/npcs` },
    { key: 'locations', label: 'Locations', url: `${root}/locations` },
    { key: 'world', label: 'World builder', url: `${root}/world` },
    { key: 'maps', label: 'Maps', url: `${root}/maps` },
    { key: 'encounters', label: 'Encounters', url: `${root}/combat-scenarios` },
    { key: 'initiative', label: 'Current initiative', url: `${root}/initiative` },
    { key: 'party', label: 'Party', url: `${root}/live-party` },
    { key: 'legacy-party', label: 'Legacy party', url: `${root}/players` },
    { key: 'members', label: 'Campaign members', url: `/campaign-invites/${campaignId}/members` },
    { key: 'live-state', label: 'Live state', url: `${root}/live-state` },
    { key: 'display-state', label: 'Player display', url: `${root}/display-state` },
    { key: 'notes', label: 'GM notes', url: `${root}/ingame-notes` },
    { key: 'inventory', label: 'Loot & rewards', url: `${root}/inventory` },
    { key: 'handouts', label: 'Handouts', url: `${root}/handouts` },
    { key: 'handout-recipients', label: 'Handout recipients', url: `${root}/handout-recipients` },
    { key: 'powers', label: 'Factions & powers', url: `${root}/gods` },
    { key: 'tables', label: 'Tables & references', url: `${root}/tables` },
    { key: 'timeline', label: 'Timeline', url: `${root}/timeline` },
    { key: 'calendar', label: 'Calendar', url: `${root}/calendar` },
    { key: 'calendar-events', label: 'Calendar events', url: `${root}/calendar-events` },
    { key: 'events', label: 'Campaign events', url: `${root}/events` },
    { key: 'event-locations', label: 'Event locations & economy', url: `${root}/event-locations` },
    { key: 'roll-summary', label: 'Dice roll summary', url: `${root}/roll-events/summary` },
  ];
}

function isOfflineResponse(response) {
  return Boolean(response?.rqkOffline || response?.headers?.['x-rqk-offline-cache'] === '1');
}

function isAuthFailure(error) {
  return error?.response?.status === 401 || error?.response?.status === 403;
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

function extractCustomRuleIds(rulesPayload) {
  const rows = Array.isArray(rulesPayload)
    ? rulesPayload
    : Array.isArray(rulesPayload?.rules)
      ? rulesPayload.rules
      : [];
  return unique(rows.map(rule => rule?.id ? String(rule.id) : ''));
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

async function pinDynamicRequests(requests, context) {
  const { sections, recordKeys, mediaPayloads, onProgress, phase } = context;
  let completed = 0;
  for (const request of requests) {
    onProgress({ phase, completed, total: requests.length, label: request.label });
    try {
      const { response, recordKey } = await fetchAndPin(request);
      mediaPayloads.push(response.data);
      if (recordKey) recordKeys.push(recordKey);
      sections.push(sectionResult(request, 'saved', { savedAt: Date.now() }));
    } catch (error) {
      if (isAuthFailure(error)) throw error;
      sections.push(sectionResult(request, 'unavailable', {
        message: error?.response?.data?.detail || error?.message || `Could not download ${request.label}.`,
      }));
    }
    completed += 1;
  }
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
  const mediaPayloads = [];
  const requests = buildGmOfflinePackRequests(campaignId);
  const totalBase = requests.length;
  let completed = 0;

  for (const request of requests) {
    onProgress({ phase: 'campaign', completed, total: totalBase, label: request.label });
    try {
      const { response, recordKey } = await fetchAndPin(request);
      payloads[request.key] = response.data;
      mediaPayloads.push(response.data);
      if (recordKey) recordKeys.push(recordKey);
      sections.push(sectionResult(request, 'saved', { savedAt: Date.now() }));
    } catch (error) {
      if (isAuthFailure(error)) throw error;
      sections.push(sectionResult(request, 'unavailable', {
        message: error?.response?.data?.detail || error?.message || 'Could not download this section.',
      }));
      if (request.required) {
        throw new Error(error?.response?.data?.detail || error?.message || `Could not download ${request.label}.`);
      }
    }
    completed += 1;
  }

  // The custom-rules index intentionally omits rule text. Pin each detail record
  // so rules and uploaded reference documents are genuinely usable offline.
  const customRuleRequests = extractCustomRuleIds(payloads.rules).map(ruleId => ({
    key: `custom-rule:${ruleId}`,
    label: 'Custom rule content',
    url: `/campaigns/${campaignId}/custom-rules/${ruleId}`,
  }));
  await pinDynamicRequests(customRuleRequests, {
    sections,
    recordKeys,
    mediaPayloads,
    onProgress,
    phase: 'rules',
  });

  const characterIds = extractCharacterIds(payloads.party, payloads['legacy-party']);
  const characterRequests = characterIds.map((characterId, index) => ({
    key: `character:${characterId}`,
    label: `Character ${index + 1} of ${characterIds.length}`,
    url: `/characters/${characterId}`,
  }));
  await pinDynamicRequests(characterRequests, {
    sections,
    recordKeys,
    mediaPayloads,
    onProgress,
    phase: 'characters',
  });

  const discoveredMedia = extractOfflineMediaUrls(...mediaPayloads);
  const mediaResult = await cacheOfflineMediaUrls(discoveredMedia, {
    onProgress: mediaProgress => onProgress({ ...mediaProgress, phase: 'media' }),
  });
  if (discoveredMedia.length) {
    sections.push(sectionResult(
      { key: 'media', label: 'Maps, handouts & images', url: '' },
      mediaResult.failed.length ? 'unavailable' : 'saved',
      mediaResult.failed.length
        ? { message: `${mediaResult.failed.length} of ${discoveredMedia.length} media file${discoveredMedia.length === 1 ? '' : 's'} could not be stored offline.` }
        : { savedAt: Date.now() }
    ));
  }

  const failedSections = sections.filter(section => section.status !== 'saved');
  const metadata = await saveOfflineCampaignPackMetadata({
    version: OFFLINE_PACK_VERSION,
    audience: 'gm',
    campaignId: String(campaignId),
    campaignName: payloads.campaign?.name || options.campaignName || 'Campaign',
    savedAt: Date.now(),
    recordKeys: unique(recordKeys),
    sections,
    characterIds,
    customRuleIds: extractCustomRuleIds(payloads.rules),
    successfulSections: sections.length - failedSections.length,
    failedSections: failedSections.length,
    complete: failedSections.length === 0,
    mediaUrls: mediaResult.saved,
    mediaDiscovered: discoveredMedia.length,
    mediaSaved: mediaResult.saved.length,
    mediaFailed: mediaResult.failed.length,
    mediaIncluded: mediaResult.saved.length > 0,
  });

  onProgress({ phase: 'done', completed: sections.length, total: sections.length, label: 'Offline copy ready' });
  return metadata;
}

export async function getCampaignOfflinePack(campaignId) {
  return getOfflineCampaignPackMetadata(campaignId, 'gm');
}

export async function deleteCampaignOfflinePack(campaignId) {
  const current = await getOfflineCampaignPackMetadata(campaignId, 'gm');
  if (current?.mediaUrls?.length) {
    const allPacks = await listOfflineCampaignPacks();
    const protectedMedia = allPacks
      .filter(pack => !(String(pack.campaignId) === String(campaignId) && pack.audience === 'gm'))
      .flatMap(pack => Array.isArray(pack.mediaUrls) ? pack.mediaUrls : []);
    await removeOfflineMediaUrls(current.mediaUrls, protectedMedia);
  }
  return removeOfflineCampaignPack(campaignId, 'gm');
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