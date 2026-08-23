import { summarizeHandouts } from './playerDashboardUtils';

function readList(result, objectKey) {
  if (!result || result.status !== 'fulfilled') return null;

  const data = result.value?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[objectKey])) return data[objectKey];
  return null;
}

function mergeCampaignSources(gmCampaigns, joinedCampaigns) {
  const campaignMap = new Map();

  [...gmCampaigns, ...joinedCampaigns].forEach((campaign) => {
    if (campaign?.id) campaignMap.set(campaign.id, campaign);
  });

  return Array.from(campaignMap.values());
}

export function resolvePlayerDashboardSettledResults(results = []) {
  const [charactersResult, gmCampaignsResult, joinedCampaignsResult, handoutsResult] = results;
  const failures = [];

  const loadedCharacters = readList(charactersResult, 'characters');
  if (loadedCharacters === null) failures.push('characters');

  const gmCampaigns = readList(gmCampaignsResult, 'campaigns');
  const joinedCampaigns = readList(joinedCampaignsResult, 'campaigns');
  const loadedCampaigns = gmCampaigns !== null && joinedCampaigns !== null
    ? mergeCampaignSources(gmCampaigns, joinedCampaigns)
    : null;
  if (loadedCampaigns === null) failures.push('campaigns');

  const handouts = readList(handoutsResult, 'handouts');
  const handoutSummary = handouts === null ? null : summarizeHandouts(handouts);
  if (handoutSummary === null) failures.push('handouts');

  return {
    ok: failures.length === 0,
    failures,
    characters: loadedCharacters,
    campaigns: loadedCampaigns,
    handoutSummary,
  };
}

export async function fetchPlayerDashboardSections(client) {
  const results = await Promise.allSettled([
    client.get('/characters'),
    client.get('/campaigns'),
    client.get('/campaign-invites/joined/list'),
    client.get('/player/handouts'),
  ]);

  return resolvePlayerDashboardSettledResults(results);
}

export function describePlayerDashboardFailures(failures = []) {
  if (!failures.length) return '';

  const labels = failures.map((failure) => {
    if (failure === 'characters') return 'characters';
    if (failure === 'campaigns') return 'campaigns';
    if (failure === 'handouts') return 'received handouts';
    return failure;
  });

  const readable = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;

  return `Could not refresh ${readable}. Showing last known data where available.`;
}
