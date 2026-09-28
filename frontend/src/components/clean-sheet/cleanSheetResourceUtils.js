const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const titleFromKey = (value = '') => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

export const normaliseResourceKey = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const singularResourceKey = (value = '') => normaliseResourceKey(value).replace(/s\b/g, '');

export function trackedResourceCards(character = {}) {
  const resourceMap = character.resources || {};
  if (!resourceMap || typeof resourceMap !== 'object' || Array.isArray(resourceMap)) return [];

  return Object.entries(resourceMap).flatMap(([key, value]) => {
    const raw = value && typeof value === 'object' ? value : { current: value, remaining: value, max: value };
    const max = Number(raw.max ?? raw.maximum ?? raw.total ?? raw.uses ?? raw.value ?? 0);
    if (!max) return [];
    return [{
      key,
      label: raw.label || raw.name || titleFromKey(key),
      className: raw.className || raw.class_name || raw.source || (raw.homebrew ? 'Homebrew' : 'Class'),
      current: Number(raw.current ?? raw.remaining ?? max),
      max,
      restore: raw.restore || raw.recovery || raw.refresh || 'long-rest',
      fieldKey: key,
      raw,
      resourceMap,
    }];
  });
}

export function savedResourceCards(character = {}) {
  const cards = [...trackedResourceCards(character)];
  const sorceryMax = Number(character.sorcery_points || 0);
  if (sorceryMax > 0) {
    cards.push({
      key: 'sorcery_points',
      label: 'Sorcery Points',
      className: 'Sorcerer',
      current: Number(character.sorcery_points_remaining ?? sorceryMax),
      max: sorceryMax,
      restore: 'long-rest',
      field: 'sorcery_points_remaining',
    });
  }

  const superiority = character.superiority_dice || {};
  const superiorityMax = Number(superiority.total || 0);
  if (superiorityMax > 0) {
    cards.push({
      key: 'superiority_dice',
      label: `Superiority Dice ${superiority.die || ''}`.trim(),
      className: 'Battle Master',
      current: Number(superiority.remaining ?? superiorityMax),
      max: superiorityMax,
      restore: 'short-rest',
      nestedField: 'superiority_dice',
      raw: superiority,
    });
  }

  toArray(character.homebrew_resources).forEach((resource, index) => {
    const max = Number(resource.max || resource.maximum || resource.total || resource.uses || 0);
    if (!max) return;
    cards.push({
      key: resource.key || resource.name || `homebrew-resource-${index}`,
      label: resource.label || resource.name || `Homebrew Resource ${index + 1}`,
      className: resource.className || resource.source || 'Homebrew',
      current: Number(resource.current ?? resource.remaining ?? max),
      max,
      restore: resource.restore || resource.recovery || 'long-rest',
    });
  });

  return cards;
}

export function resourceDedupeKey(resource = {}) {
  const explicit = normaliseResourceKey(resource.key || resource.fieldKey);
  if (explicit) return explicit;
  const readable = resource.label || resource.name || resource.raw?.label || resource.raw?.name;
  return singularResourceKey(readable);
}

function enrichSnapshotResource(resource = {}, character = {}) {
  const key = resource.key || resource.fieldKey || '';
  const resourceMap = character.resources || {};
  const raw = key && resourceMap?.[key] && typeof resourceMap[key] === 'object'
    ? resourceMap[key]
    : {};
  return {
    ...resource,
    current: Number(resource.current ?? raw.current ?? raw.remaining ?? resource.max ?? 0),
    max: Number(resource.max ?? raw.max ?? raw.maximum ?? 0),
    restore: resource.restore || raw.restore || raw.recovery || 'long-rest',
    ...(key ? { fieldKey: key, resourceMap, raw: { ...raw, ...resource.raw } } : {}),
  };
}

export function getSheetResourceCards(character = {}, snapshotResources = []) {
  const candidates = [
    ...savedResourceCards(character),
    ...toArray(snapshotResources).map(resource => enrichSnapshotResource(resource, character)),
  ];

  const byKey = new Map();
  candidates.forEach(resource => {
    if (!Number(resource.max || 0)) return;
    const key = resourceDedupeKey(resource);
    if (!key) return;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, resource);
      return;
    }

    const existingPatchable = canPatchResource(existing);
    const nextPatchable = canPatchResource(resource);
    if (!existingPatchable && nextPatchable) {
      byKey.set(key, resource);
      return;
    }

    const existingCurrent = Number(existing.current ?? 0);
    const nextCurrent = Number(resource.current ?? 0);
    if (existingCurrent === 0 && nextCurrent > 0 && !existingPatchable) byKey.set(key, resource);
  });

  return Array.from(byKey.values());
}

export function buildResourcePatch(resource, nextValue) {
  if (resource.field) return { [resource.field]: nextValue };
  if (resource.nestedField) {
    return {
      [resource.nestedField]: {
        ...(resource.raw || {}),
        remaining: nextValue,
      },
    };
  }
  if (resource.fieldKey) {
    return {
      resources: {
        ...(resource.resourceMap || {}),
        [resource.fieldKey]: {
          ...(resource.raw || {}),
          current: nextValue,
          remaining: nextValue,
          max: Number(resource.max || 0),
        },
      },
    };
  }
  return null;
}

export function canPatchResource(resource = {}) {
  return Boolean(resource.field || resource.nestedField || resource.fieldKey);
}

export function resourceRecoveryLabel(resource = {}) {
  const raw = String(resource.restore || resource.recovery || 'long-rest')
    .trim()
    .toLowerCase();
  if (raw.includes('short')) return 'Short Rest';
  if (raw.includes('long')) return 'Long Rest';
  if (raw.includes('dawn')) return 'Dawn';
  if (raw.includes('day')) return 'Daily';
  return raw ? raw.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Long Rest';
}

export function isSpellPoolResource(resource = {}) {
  const key = normaliseResourceKey(resource.key || resource.fieldKey || '');
  const label = normaliseResourceKey(resource.label || resource.name || '');
  return key === 'pact magic'
    || key.includes('spell slot')
    || label === 'pact magic'
    || label.includes('spell slot');
}
