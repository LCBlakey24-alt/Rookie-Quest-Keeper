function cleanRecords(value) {
  if (!Array.isArray(value)) return null;
  return value.filter((item) => item && typeof item === 'object');
}

function readList(result, objectKeys = []) {
  if (!result || result.status !== 'fulfilled') return null;

  const data = result.value?.data;
  const direct = cleanRecords(data);
  if (direct !== null) return direct;

  if (!data || typeof data !== 'object') return null;
  for (const key of objectKeys) {
    const nested = cleanRecords(data[key]);
    if (nested !== null) return nested;
  }
  return null;
}

function readObject(result) {
  if (!result || result.status !== 'fulfilled') return null;
  const data = result.value?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data;
}

function readAdminFlag(result) {
  const data = readObject(result);
  return typeof data?.is_admin === 'boolean' ? data.is_admin : null;
}

function readHomebrew(result) {
  if (!result || result.status !== 'fulfilled') return null;
  const data = result.value?.data;
  if (data == null) return null;

  const library = data?.homebrew ?? data;
  const direct = cleanRecords(library);
  if (direct !== null) return direct;
  if (!library || typeof library !== 'object' || Array.isArray(library)) return null;

  const entries = Object.entries(library);
  if (entries.length === 0) return [];

  const groupedEntries = entries.filter(([, records]) => Array.isArray(records));
  if (groupedEntries.length === 0) return null;

  return groupedEntries.flatMap(([contentType, records]) => (
    cleanRecords(records).map((record) => ({
      ...record,
      content_type: record.content_type || contentType,
    }))
  ));
}

export function resolveDashboardPrimaryResults(results = []) {
  const [charactersResult, campaignsResult, adminResult, settingsResult, homebrewResult] = results;
  const failures = [];

  const characters = readList(charactersResult, ['characters', 'items']);
  if (characters === null) failures.push('characters');

  const campaigns = readList(campaignsResult, ['campaigns', 'items']);
  if (campaigns === null) failures.push('campaigns');

  const isAdmin = readAdminFlag(adminResult);
  if (isAdmin === null) failures.push('admin access');

  const siteSettings = readObject(settingsResult);
  if (siteSettings === null) failures.push('site settings');

  const homebrewItems = readHomebrew(homebrewResult);
  if (homebrewItems === null) failures.push('homebrew');

  return {
    characters,
    campaigns,
    isAdmin,
    siteSettings,
    homebrewItems,
    failures,
  };
}

export async function fetchHomeDashboardSections(client) {
  const primaryResults = await Promise.allSettled([
    client.get('/characters'),
    client.get('/campaigns'),
    client.get('/admin/check'),
    client.get('/site-settings'),
    client.get('/homebrew'),
  ]);

  const primary = resolveDashboardPrimaryResults(primaryResults);
  const failures = [...primary.failures];
  let adminOverview = null;

  if (primary.isAdmin === true) {
    const [overviewResult] = await Promise.allSettled([
      client.get('/admin/mission-overview'),
    ]);
    adminOverview = readObject(overviewResult);
    if (adminOverview === null) failures.push('admin overview');
  } else if (primary.isAdmin === false) {
    adminOverview = {};
  }

  return {
    ...primary,
    adminOverview,
    failures,
    ok: failures.length === 0,
  };
}

export function describeHomeDashboardFailures(failures = []) {
  if (!failures.length) return '';

  const readable = failures.length === 1
    ? failures[0]
    : `${failures.slice(0, -1).join(', ')} and ${failures[failures.length - 1]}`;

  return `Could not refresh ${readable}. Showing last known data where available.`;
}
