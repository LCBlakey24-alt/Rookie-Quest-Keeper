export function readPlayerList(data, key) {
  const list = Array.isArray(data) ? data : data?.[key];
  if (!Array.isArray(list) || list.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error(`Invalid ${key} response`);
  }
  return list;
}

function campaignSummary(data, campaignId) {
  if (!data || data.id !== campaignId) throw new Error('Campaign could not be confirmed');
  // Also filter older API responses; never render a GM document in this view.
  const { id, name, description, system, rules_edition, world_name } = data;
  const environment = {};
  ['weather', 'time_of_day', 'season', 'terrain', 'temperature', 'background_image'].forEach(key => {
    if (typeof data.environment?.[key] === 'string') environment[key] = data.environment[key];
  });
  return { id, name, description, system, rules_edition, world_name, environment };
}

export async function fetchPlayerCampaign(client, campaignId) {
  let data;
  try {
    data = (await client.get(`/player/campaign/${campaignId}`)).data;
  } catch (error) {
    // Older backends do not yet expose this route. Never retry a denied request
    // against a GM endpoint or turn a server/network failure into empty data.
    if (error?.response?.status !== 404) throw error;
    const joined = readPlayerList((await client.get('/campaign-invites/joined/list')).data, 'campaigns');
    return { campaign: campaignSummary(joined.find(item => item.id === campaignId), campaignId), party: null };
  }
  const campaign = campaignSummary(data, campaignId);
  const party = readPlayerList(data.party, 'party').map(({ id, name, character_name, character_class, class_name, level }) => (
    { id, name, character_name, character_class, class_name, level }
  ));
  return { campaign, party };
}

export async function fetchPlayerCampaignSections(client, campaignId) {
  const [campaignResult, charactersResult] = await Promise.allSettled([
    fetchPlayerCampaign(client, campaignId),
    client.get('/characters').then(response => readPlayerList(response.data, 'characters')
      .filter(character => (character.campaign_id || character.campaignId) === campaignId)),
  ]);
  const failures = [];
  let campaign = null;
  let party = null;
  let characters = null;
  if (campaignResult.status === 'fulfilled') {
    ({ campaign, party } = campaignResult.value);
    if (party === null) failures.push('party');
  } else failures.push('campaign details');
  if (charactersResult.status === 'fulfilled') characters = charactersResult.value;
  else failures.push('characters');
  return { campaign, party, characters, failures };
}
