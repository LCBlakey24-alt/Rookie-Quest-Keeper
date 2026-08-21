const REFRESH_SECTIONS = [
  { key: 'items', label: 'party loot' },
  { key: 'currency', label: 'party funds' },
  { key: 'grantTargets', label: 'grant targets' },
];

export function resolvePartyInventoryRefreshResults(results = []) {
  const data = {};
  const failures = [];

  REFRESH_SECTIONS.forEach((section, index) => {
    const result = results[index];
    if (result?.status === 'fulfilled') data[section.key] = result.value?.data;
    else failures.push(section.label);
  });

  return { data, failures };
}

export function partyInventoryRefreshWarning(failures = []) {
  if (!failures.length) return '';
  return `Could not refresh ${failures.join(', ')}. Failed sections were not treated as empty campaign data.`;
}

export async function createInventoryBatch(items = [], createItem, onCreated = () => {}) {
  const created = [];

  for (const item of items) {
    try {
      const result = await createItem(item);
      created.push(result);
      onCreated(item, result);
    } catch (error) {
      return { created, failedItem: item, error };
    }
  }

  return { created, failedItem: null, error: null };
}
