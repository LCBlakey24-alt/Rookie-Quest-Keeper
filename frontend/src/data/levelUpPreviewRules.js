import { getCharacterClassFeatures } from './characterFeatureSelectors';
import { getClassResourceRules } from './classResourceRules';
import { normaliseClassLevels } from './levelUpProgressionRules';

const normaliseName = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const resourceLabel = (rule = {}, character = {}) => (
  typeof rule.label === 'function' ? rule.label(character) : rule.label
) || String(rule.key || 'Resource').replace(/[_-]+/g, ' ');

const featureKey = (feature = {}) => [
  normaliseName(feature.name),
  normaliseName(feature.source || 'class'),
  Number(feature.level || 0),
].join(':');

function classPreviewCharacter(character, className, classLevel, edition, subclass = '') {
  return {
    ...character,
    character_class: className,
    class_name: className,
    className,
    level: Math.max(1, Number(classLevel || 1)),
    subclass,
    rules_edition: edition,
    edition,
    class_levels: { [className]: Math.max(1, Number(classLevel || 1)) },
    multiclass_levels: {},
    classes: [{ name: className, level: Math.max(1, Number(classLevel || 1)), subclass }],
  };
}

function resourcePreviewCharacter(character, className, classLevelAfter, totalLevelAfter, edition) {
  const beforeLevels = normaliseClassLevels(character);
  const afterLevels = {
    ...beforeLevels,
    [className]: Math.max(1, Number(classLevelAfter || 1)),
  };
  const classes = Object.entries(afterLevels).map(([name, level]) => {
    const existing = (Array.isArray(character?.classes) ? character.classes : [])
      .find((entry) => normaliseName(entry?.name || entry?.class_name || entry?.className || entry?.class) === normaliseName(name));
    return {
      ...(existing || {}),
      name,
      level,
    };
  });

  return {
    ...character,
    level: Math.max(1, Number(totalLevelAfter || character?.level || 1)),
    rules_edition: edition,
    edition,
    class_levels: afterLevels,
    multiclass_levels: Object.keys(afterLevels).length > 1 ? afterLevels : {},
    classes,
  };
}

function resourceMap(character = {}) {
  return new Map(getClassResourceRules(character).map((rule) => [
    rule.key,
    {
      key: rule.key,
      label: resourceLabel(rule, character),
      max: Math.max(0, Number(rule.maxValue || 0)),
      restore: rule.restore || 'long-rest',
      shortRestRestore: Math.max(0, Number(rule.shortRestRestoreValue || 0)),
      slotLevel: Math.max(0, Number(rule.slotLevelValue || 0)),
    },
  ]));
}

export function getLevelUpFeatureUnlocks({
  character = {},
  className = '',
  classLevelBefore = 0,
  classLevelAfter = 1,
  edition = '2014',
  existingSubclass = '',
  selectedSubclass = '',
} = {}) {
  if (!className || Number(classLevelAfter || 0) <= 0) return [];

  const beforeFeatures = Number(classLevelBefore || 0) > 0
    ? getCharacterClassFeatures(
      classPreviewCharacter(character, className, classLevelBefore, edition, existingSubclass),
      edition,
    )
    : [];

  const afterFeatures = getCharacterClassFeatures(
    classPreviewCharacter(
      character,
      className,
      classLevelAfter,
      edition,
      selectedSubclass || existingSubclass,
    ),
    edition,
  );

  const beforeKeys = new Set(beforeFeatures.map(featureKey));
  return afterFeatures
    .filter((feature) => !beforeKeys.has(featureKey(feature)))
    .map((feature) => ({
      name: feature.name,
      level: Number(feature.level || classLevelAfter),
      type: feature.type || 'feature',
      source: feature.source || 'class',
      subclass: feature.subclass || '',
      description: feature.description || '',
    }));
}

export function getLevelUpResourceChanges({
  character = {},
  className = '',
  classLevelAfter = 1,
  totalLevelAfter = null,
  edition = '2014',
} = {}) {
  if (!className) return [];

  const beforeCharacter = {
    ...character,
    rules_edition: edition,
    edition,
  };
  const afterCharacter = resourcePreviewCharacter(
    character,
    className,
    classLevelAfter,
    totalLevelAfter || Number(character?.level || 1) + 1,
    edition,
  );

  const before = resourceMap(beforeCharacter);
  const after = resourceMap(afterCharacter);
  const keys = Array.from(new Set([...before.keys(), ...after.keys()]));

  return keys
    .map((key) => {
      const previous = before.get(key);
      const next = after.get(key);
      if (!next) return null;

      const unlocked = !previous;
      const maxChanged = Number(previous?.max || 0) !== Number(next.max || 0);
      const recoveryChanged = (
        (previous?.restore || '') !== (next.restore || '')
        || Number(previous?.shortRestRestore || 0) !== Number(next.shortRestRestore || 0)
      );
      const slotLevelChanged = Number(previous?.slotLevel || 0) !== Number(next.slotLevel || 0);
      if (!unlocked && !maxChanged && !recoveryChanged && !slotLevelChanged) return null;

      return {
        key,
        label: next.label,
        beforeMax: Number(previous?.max || 0),
        afterMax: Number(next.max || 0),
        beforeRestore: previous?.restore || '',
        afterRestore: next.restore || '',
        beforeShortRestRestore: Number(previous?.shortRestRestore || 0),
        afterShortRestRestore: Number(next.shortRestRestore || 0),
        beforeSlotLevel: Number(previous?.slotLevel || 0),
        afterSlotLevel: Number(next.slotLevel || 0),
        unlocked,
        maxChanged,
        recoveryChanged,
        slotLevelChanged,
      };
    })
    .filter(Boolean);
}

export function resourceChangeSummary(change = {}) {
  if (change.unlocked) {
    return `${change.label} unlocks at ${change.afterMax} max • ${String(change.afterRestore || 'long-rest').replace(/-/g, ' ')}`;
  }

  const pieces = [];
  if (change.maxChanged) pieces.push(`${change.beforeMax} → ${change.afterMax} max`);
  if (change.recoveryChanged) {
    pieces.push(`${String(change.beforeRestore || 'none').replace(/-/g, ' ')} → ${String(change.afterRestore || 'long-rest').replace(/-/g, ' ')} recovery`);
  }
  if (change.slotLevelChanged) pieces.push(`slot level ${change.beforeSlotLevel || '—'} → ${change.afterSlotLevel || '—'}`);
  return `${change.label}: ${pieces.join(' • ')}`;
}
