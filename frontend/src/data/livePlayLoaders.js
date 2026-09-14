const SECTION_LABELS = {
  campaign: 'campaign',
  players: 'party',
  scenarios: 'encounters',
  calendar: 'calendar',
  notes: 'notes',
  npcs: 'NPCs',
  liveState: 'travelling NPC state',
};

async function readSection(apiClient, url) {
  try {
    const response = await apiClient.get(url);
    return { ok: true, data: response?.data };
  } catch (error) {
    return { ok: false, error };
  }
}

function collectErrors(sections) {
  return Object.entries(sections)
    .filter(([, result]) => !result?.ok)
    .map(([key, result]) => ({
      key,
      label: SECTION_LABELS[key] || key,
      error: result?.error,
    }));
}

export async function loadLiveSessionSections(apiClient, campaignId) {
  const [campaign, players, scenarios, calendar, notes] = await Promise.all([
    readSection(apiClient, `/campaigns/${campaignId}`),
    readSection(apiClient, `/campaigns/${campaignId}/players`),
    readSection(apiClient, `/campaigns/${campaignId}/combat-scenarios`),
    readSection(apiClient, `/campaigns/${campaignId}/calendar`),
    readSection(apiClient, `/campaigns/${campaignId}/ingame-notes`),
  ]);

  const sections = { campaign, players, scenarios, calendar, notes };
  return { sections, errors: collectErrors(sections) };
}

async function readPartyWithFallback(apiClient, campaignId) {
  const liveParty = await readSection(apiClient, `/campaigns/${campaignId}/live-party`);
  if (liveParty.ok) return { ...liveParty, source: 'live-party' };

  const legacyParty = await readSection(apiClient, `/campaigns/${campaignId}/players`);
  if (legacyParty.ok) return { ...legacyParty, source: 'players-fallback' };

  return {
    ok: false,
    source: 'unavailable',
    error: legacyParty.error || liveParty.error,
    primaryError: liveParty.error,
  };
}

export async function loadEncounterReviewSections(apiClient, campaignId) {
  const [campaign, scenarios, players, npcs, liveState] = await Promise.all([
    readSection(apiClient, `/campaigns/${campaignId}`),
    readSection(apiClient, `/campaigns/${campaignId}/combat-scenarios`),
    readPartyWithFallback(apiClient, campaignId),
    readSection(apiClient, `/campaigns/${campaignId}/npcs`),
    readSection(apiClient, `/campaigns/${campaignId}/live-state`),
  ]);

  const sections = { campaign, scenarios, players, npcs, liveState };
  return { sections, errors: collectErrors(sections) };
}

export function describeLiveLoadErrors(errors = []) {
  const labels = [...new Set(errors.map(item => item?.label).filter(Boolean))];
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}
