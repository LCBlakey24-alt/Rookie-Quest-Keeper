// Lightweight client-side character rule audit helpers.
// These do not block play; they return warnings we can surface in dev/admin UI later.

import { getClassResourceRules } from './classResourceRules';

export function auditCharacterResources(character) {
  const warnings = [];
  const allowedRules = getClassResourceRules(character);
  const allowedKeys = new Set(allowedRules.map(rule => rule.key));
  const resources = character?.resources || {};

  Object.entries(resources).forEach(([key, value]) => {
    if (!allowedKeys.has(key)) {
      warnings.push({
        code: 'RESOURCE_BEFORE_UNLOCK_OR_WRONG_CLASS',
        field: `resources.${key}`,
        message: `${value?.label || key} appears on this character before it is unlocked or for the wrong class.`,
      });
    }
  });

  allowedRules.forEach(rule => {
    const resource = resources[rule.key];
    if (!resource) return;
    const max = Number(resource.max ?? resource.total ?? resource.remaining ?? resource.current ?? 0) || 0;
    if (max > rule.maxValue) {
      warnings.push({
        code: 'RESOURCE_MAX_TOO_HIGH',
        field: `resources.${rule.key}.max`,
        message: `${rule.label} has max ${max}, but expected ${rule.maxValue} at level ${character?.level || 1}.`,
      });
    }
  });

  return warnings;
}

export function auditCharacter(character) {
  return [
    ...auditCharacterResources(character),
  ];
}
