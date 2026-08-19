import apiClient from '@/lib/apiClient';
import {
  getOfflineCacheKey,
  getOfflineCampaignPackMetadata,
  removeOfflineCampaignPack,
  saveOfflineCampaignPackMetadata,
  storeOfflineApiResponse,
} from '@/offline/offlineApiCache';
import { OFFLINE_PACK_VERSION } from '@/offline/offlineCampaignPack';

function asList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
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

function requestList(campaignId) {
  return [
    { key: 'campaign', label: 'Player campaign', url: `/player/campaign/${campaignId}`, required: true },
    { key: 'party', label: 'Party roster', url: `/campaigns/${campaignId}/players` },
    { key: 'characters', label: 'Your characters', url: '/characters' },
    { key: 'handouts', label: 'Shared handouts', url: '/player/handouts' },
    { key: 'environment', label: 'Campaign environment', url: `/campaigns/${campaignId}/environment` },
    { key: 'rules', label: 'Player-visible campaign rules', url: `/campaigns/${campaignId}/custom-rules` },
  ];
}

function linkedCharacterIds(campaignId, characterPayload, partyPayload) {
  const characters = asList(characterPayload, 'characters');
  const party = asList(partyPayload, 'players');
  const linkedIds = new Set(
    party.flatMap(player => [player?.character_id, player?.characterId, player?.player_character_id, player?.character?.id]).filter(Boolean).map(String)
  );
  return unique(characters
    .filter(character =>
      String(character?.campaign_id || character?.campaignId || '') === String(campaignId)
      || linkedIds.has(String(character?.id || ''))
    )
    .map(character => character?.id ? String(character.id) : ''));
}

export async function downloadPlayerOfflinePack(campaignId, options = {}) {
  if (!campaignId) throw new Error('Campaign id is required.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Reconnect before downloading or refreshing your offline campaign.');
  }

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const sections = [];
  const recordKeys = [];
  const payloads = {};
  const requests = requestList(campaignId);
  let completed = 0;

  for (const request of requests) {
    onProgress({ phase: 'player', completed, total: requests.length, label: request.label });
    try {
      const { response, recordKey } = await fetchAndPin(request);
      payloads[request.key] = response.data;
      if (recordKey) recordKeys.push(recordKey);
      sections.push({ ...request, status: 'saved', savedAt: Date.now() });
    } catch (error) {
      if (isAuthFailure(error) && request.required) throw error;
      sections.push({
        ...request,
        status: 'unavailable',
        message: error?.response?.data?.detail || error?.message || 'Could not download this section.',
      });
      if (request.required) throw new Error(error?.response?.data?.detail || `Could not download ${request.label}.`);
    }
    completed += 1;
  }

  const characterIds = linkedCharacterIds(campaignId, payloads.characters, payloads.party);
  let characterCompleted = 0;
  for (const characterId of characterIds) {
    const request = { key: `character:${characterId}`, label: 'Character sheet', url: `/characters/${characterId}` };
    onProgress({
      phase: 'characters',
      completed: characterCompleted,
      total: characterIds.length,
      label: `Character ${characterCompleted + 1} of ${characterIds.length}`,
    });
    try {
      const { recordKey } = await fetchAndPin(request);
      if (recordKey) recordKeys.push(recordKey);
      sections.push({ ...request, status: 'saved', savedAt: Date.now() });
    } catch (error) {
      if (isAuthFailure(error)) throw error;
      sections.push({
        ...request,
        status: 'unavailable',
        message: error?.response?.data?.detail || error?.message || 'Could not download character sheet.',
      });
    }
    characterCompleted += 1;
  }

  const failedSections = sections.filter(section => section.status !== 'saved');
  const campaign = payloads.campaign || {};
  const metadata = await saveOfflineCampaignPackMetadata({
    version: OFFLINE_PACK_VERSION,
    audience: 'player',
    campaignId: String(campaignId),
    campaignName: campaign.name || campaign.campaign_name || options.campaignName || 'Campaign',
    savedAt: Date.now(),
    recordKeys: unique(recordKeys),
    sections,
    characterIds,
    successfulSections: sections.length - failedSections.length,
    failedSections: failedSections.length,
    complete: failedSections.length === 0,
    mediaIncluded: false,
    playerSafe: true,
  });

  onProgress({ phase: 'done', completed: sections.length, total: sections.length, label: 'Player offline copy ready' });
  return metadata;
}

export async function getPlayerOfflinePack(campaignId) {
  return getOfflineCampaignPackMetadata(campaignId, 'player');
}

export async function deletePlayerOfflinePack(campaignId) {
  return removeOfflineCampaignPack(campaignId, 'player');
}
