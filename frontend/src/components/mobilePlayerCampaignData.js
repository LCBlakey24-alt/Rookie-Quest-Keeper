function readList(result, objectKey) {
  if (!result || result.status !== 'fulfilled') return null;
  const data = result.value?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[objectKey])) return data[objectKey];
  return null;
}

function readObjectResult(result) {
  if (!result || result.status !== 'fulfilled') return null;
  const data = result.value;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data;
}

function mergeCampaignLists(...groups) {
  const map = new Map();
  groups.flat().forEach((campaign) => {
    if (campaign?.id) map.set(campaign.id, campaign);
  });
  return Array.from(map.values());
}

export function resolveMobileDashboardResults(results = []) {
  const [charactersResult, ownedCampaignsResult, joinedCampaignsResult] = results;
  const failures = [];

  const characters = readList(charactersResult, 'characters');
  if (characters === null) failures.push('characters');

  const ownedCampaigns = readList(ownedCampaignsResult, 'campaigns');
  const joinedCampaigns = readList(joinedCampaignsResult, 'campaigns');
  const campaigns = ownedCampaigns !== null && joinedCampaigns !== null
    ? mergeCampaignLists(ownedCampaigns, joinedCampaigns)
    : null;
  if (campaigns === null) failures.push('campaigns');

  return {
    ok: failures.length === 0,
    failures,
    characters,
    campaigns,
  };
}

export async function fetchMobileDashboardSections(client) {
  const results = await Promise.allSettled([
    client.get('/characters'),
    client.get('/campaigns'),
    client.get('/campaign-invites/joined/list'),
  ]);
  return resolveMobileDashboardResults(results);
}

export async function fetchCampaignWithFallback(client, campaignId) {
  const paths = [
    `/player/campaign/${campaignId}`,
    `/campaigns/${campaignId}`,
  ];

  for (const path of paths) {
    try {
      const response = await client.get(path);
      const data = response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    } catch {
      // Try the next legitimate campaign endpoint before reporting failure.
    }
  }

  return null;
}

export function resolveMobileCampaignResults(results = []) {
  const [campaignResult, playersResult, charactersResult] = results;
  const failures = [];

  const campaign = readObjectResult(campaignResult);
  if (campaign === null) failures.push('campaign details');

  const players = readList(playersResult, 'players');
  if (players === null) failures.push('party');

  const characters = readList(charactersResult, 'characters');
  if (characters === null) failures.push('characters');

  return {
    ok: failures.length === 0,
    failures,
    campaign,
    players,
    characters,
  };
}

export async function fetchMobileCampaignSections(client, campaignId) {
  const results = await Promise.allSettled([
    fetchCampaignWithFallback(client, campaignId),
    client.get(`/campaigns/${campaignId}/players`),
    client.get('/characters'),
  ]);
  return resolveMobileCampaignResults(results);
}

export function describeMobilePlayerFailures(failures = []) {
  if (!failures.length) return '';
  const readable = failures.length === 1
    ? failures[0]
    : `${failures.slice(0, -1).join(', ')} and ${failures[failures.length - 1]}`;
  return `Could not refresh ${readable}. Showing last known data where available.`;
}
