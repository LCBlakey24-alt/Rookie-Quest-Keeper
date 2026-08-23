function readList(result, key) {
  if (!result || result.status !== 'fulfilled') return null;
  const data = result.value?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  return null;
}

function readCompanionIds(result) {
  if (!result || result.status !== 'fulfilled') return null;
  const data = result.value?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return Array.isArray(data.companion_npc_ids) ? data.companion_npc_ids : null;
}

export function resolveLiveNpcLookupResults(results = []) {
  const [npcResult, locationResult, stateResult] = results;
  const failures = [];

  const npcs = readList(npcResult, 'npcs');
  if (npcs === null) failures.push('NPCs');

  const locations = readList(locationResult, 'locations');
  if (locations === null) failures.push('locations');

  const companionIds = readCompanionIds(stateResult);
  if (companionIds === null) failures.push('travelling party');

  return {
    ok: failures.length === 0,
    failures,
    npcs,
    locations,
    companionIds,
  };
}

export async function fetchLiveNpcLookupSections(client, campaignId) {
  const results = await Promise.allSettled([
    client.get(`/campaigns/${campaignId}/npcs`),
    client.get(`/campaigns/${campaignId}/locations`),
    client.get(`/campaigns/${campaignId}/live-state`),
  ]);
  return resolveLiveNpcLookupResults(results);
}

export function describeLiveNpcLookupFailures(failures = []) {
  if (!failures.length) return '';
  const readable = failures.length === 1
    ? failures[0]
    : `${failures.slice(0, -1).join(', ')} and ${failures[failures.length - 1]}`;
  return `Could not refresh ${readable}. Showing last known data where available.`;
}
