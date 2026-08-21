const RESOURCE_DEFINITIONS = [
  { key: 'maps', label: 'maps', path: (campaignId) => `/campaigns/${campaignId}/maps` },
  { key: 'npcs', label: 'NPCs', path: (campaignId) => `/campaigns/${campaignId}/npcs` },
  { key: 'scenarios', label: 'combat scenarios', path: (campaignId) => `/campaigns/${campaignId}/combat-scenarios` },
  { key: 'players', label: 'players', path: (campaignId) => `/campaigns/${campaignId}/players` },
];

export function resolvePlayerDisplayResourceResults(results = []) {
  const data = {};
  const failures = [];

  RESOURCE_DEFINITIONS.forEach((resource, index) => {
    const result = results[index];
    if (result?.status === 'fulfilled') {
      data[resource.key] = Array.isArray(result.value?.data) ? result.value.data : [];
    } else {
      failures.push(resource.label);
    }
  });

  return { data, failures };
}

export async function loadPlayerDisplayResources(apiClient, campaignId) {
  const results = await Promise.allSettled(
    RESOURCE_DEFINITIONS.map((resource) => apiClient.get(resource.path(campaignId))),
  );
  return resolvePlayerDisplayResourceResults(results);
}

export function playerDisplayResourceWarning(failures = []) {
  if (!failures.length) return '';
  return `Could not load ${failures.join(', ')}. Failed sections were not treated as empty campaign data.`;
}
