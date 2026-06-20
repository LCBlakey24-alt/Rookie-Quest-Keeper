import { RANGER_SUBCLASS_FEATURE_LEVELS, normaliseRangerRulesEdition } from './rangerProgression';

export const RANGER_SUBCLASSES = [
  {
    value: 'Hunter',
    label: 'Hunter',
    key: 'hunter',
    summary: 'A versatile monster-slayer focused on practical combat choices and reliable damage.',
    role: 'Flexible striker',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Beast Master',
    label: 'Beast Master',
    key: 'beast_master',
    summary: 'A Ranger who fights alongside a trained animal companion.',
    role: 'Companion controller',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Gloom Stalker',
    label: 'Gloom Stalker',
    key: 'gloom_stalker',
    summary: 'A shadowy ambusher who excels at initiative, darkness, and first-round pressure.',
    role: 'Ambush striker',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Fey Wanderer',
    label: 'Fey Wanderer',
    key: 'fey_wanderer',
    summary: 'A Ranger touched by fey magic, blending charm, mobility, and mental resilience.',
    role: 'Mystic skirmisher',
    rulesets: ['2024'],
  },
  {
    value: 'Horizon Walker',
    label: 'Horizon Walker',
    key: 'horizon_walker',
    summary: 'A planar guardian who senses portals and turns mobility into battlefield pressure.',
    role: 'Planar skirmisher',
    rulesets: ['2014'],
  },
  {
    value: 'Monster Slayer',
    label: 'Monster Slayer',
    key: 'monster_slayer',
    summary: 'A focused hunter built to identify and pressure dangerous magical foes.',
    role: 'Single-target hunter',
    rulesets: ['2014'],
  },
  {
    value: 'Swarmkeeper',
    label: 'Swarmkeeper',
    key: 'swarmkeeper',
    summary: 'A Ranger bonded to a swarm that can reposition, protect, and harry enemies.',
    role: 'Control skirmisher',
    rulesets: ['2014'],
  },
  {
    value: 'Drakewarden',
    label: 'Drakewarden',
    key: 'drakewarden',
    summary: 'A Ranger bonded to a drake companion that grows in power alongside them.',
    role: 'Companion striker',
    rulesets: ['2014'],
  },
];

export function getRangerSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^ranger /, '')
    .replace(/^conclave of( the)? /, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getRangerSubclassOptions(edition = '2014') {
  const ruleset = normaliseRangerRulesEdition(edition);
  return RANGER_SUBCLASSES
    .filter(option => option.rulesets.includes(ruleset))
    .map(option => ({
      value: option.value,
      label: option.label,
      key: option.key,
      summary: option.summary,
      role: option.role,
      ruleset,
    }));
}

export function getRangerSubclassByKey(value = '', edition = '2014') {
  const key = getRangerSubclassKey(value);
  return getRangerSubclassOptions(edition).find(option => option.key === key || getRangerSubclassKey(option.value) === key) || null;
}

export function isRangerSubclassAvailable(value = '', edition = '2014') {
  return Boolean(getRangerSubclassByKey(value, edition));
}

export function getRangerSubclassSummary(value = '', level = 1, edition = '2014') {
  const subclass = getRangerSubclassByKey(value, edition);
  const rangerLevel = Math.max(1, Number(level || 1));
  const activeFeatures = RANGER_SUBCLASS_FEATURE_LEVELS
    .filter(featureLevel => featureLevel <= rangerLevel)
    .map(featureLevel => ({
      level: featureLevel,
      key: `${subclass?.key || getRangerSubclassKey(value) || 'custom'}_${featureLevel}`,
      name: `${subclass?.label || value || 'Ranger Subclass'} Feature ${featureLevel}`,
      type: 'subclass',
    }));
  const nextLevel = RANGER_SUBCLASS_FEATURE_LEVELS.find(featureLevel => featureLevel > rangerLevel);
  const nextFeatures = nextLevel ? [{
    level: nextLevel,
    key: `${subclass?.key || getRangerSubclassKey(value) || 'custom'}_${nextLevel}`,
    name: `${subclass?.label || value || 'Ranger Subclass'} Feature ${nextLevel}`,
    type: 'subclass',
  }] : [];

  return {
    key: subclass?.key || getRangerSubclassKey(value),
    label: subclass?.label || value || '',
    role: subclass?.role || '',
    summary: subclass?.summary || '',
    supportedInRuleset: Boolean(!value || subclass),
    activeFeatures,
    nextFeatures,
  };
}
