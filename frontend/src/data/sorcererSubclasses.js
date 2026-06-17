import { getSorcererSubclassFeatureLevels, normaliseSorcererRulesEdition } from './sorcererProgression';

export const SORCERER_SUBCLASSES = [
  {
    value: 'Draconic Bloodline',
    label: 'Draconic Bloodline',
    key: 'draconic',
    summary: 'A Sorcerer origin focused on durability, elemental themes, and steady spell damage.',
    role: 'Elemental caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Wild Magic',
    label: 'Wild Magic',
    key: 'wild_magic',
    summary: 'A Sorcerer origin focused on unpredictable magic and flexible moments of luck.',
    role: 'Chaotic caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Aberrant Mind',
    label: 'Aberrant Mind',
    key: 'aberrant_mind',
    summary: 'A Sorcerer origin focused on mind magic, communication, and control.',
    role: 'Mind caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Clockwork Soul',
    label: 'Clockwork Soul',
    key: 'clockwork_soul',
    summary: 'A Sorcerer origin focused on order, protection, and reliable support.',
    role: 'Order caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Divine Soul',
    label: 'Divine Soul',
    key: 'divine_soul',
    summary: 'A Sorcerer origin focused on healing, support, and radiant themes.',
    role: 'Support caster',
    rulesets: ['2014'],
  },
  {
    value: 'Shadow Magic',
    label: 'Shadow Magic',
    key: 'shadow_magic',
    summary: 'A Sorcerer origin focused on darkness, endurance, and control.',
    role: 'Shadow caster',
    rulesets: ['2014'],
  },
  {
    value: 'Storm Sorcery',
    label: 'Storm Sorcery',
    key: 'storm_sorcery',
    summary: 'A Sorcerer origin focused on movement, thunder, lightning, and weather themes.',
    role: 'Storm caster',
    rulesets: ['2014'],
  },
];

export function getSorcererSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^sorcerous origin:?\s*/, '')
    .replace(/^sorcerer subclass:?\s*/, '')
    .replace(/ bloodline$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getSorcererSubclassOptions(edition = '2014') {
  const ruleset = normaliseSorcererRulesEdition(edition);
  return SORCERER_SUBCLASSES
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

export function getSorcererSubclassByKey(value = '', edition = '2014') {
  const key = getSorcererSubclassKey(value);
  return getSorcererSubclassOptions(edition).find(option => option.key === key || getSorcererSubclassKey(option.value) === key) || null;
}

export function isSorcererSubclassAvailable(value = '', edition = '2014') {
  return Boolean(getSorcererSubclassByKey(value, edition));
}

function buildSubclassFeature(subclass, fallbackValue, featureLevel) {
  const key = subclass?.key || getSorcererSubclassKey(fallbackValue) || 'custom';
  const label = subclass?.label || fallbackValue || 'Sorcerer Origin';
  return {
    level: featureLevel,
    key: `${key}_${featureLevel}`,
    name: `${label} Feature ${featureLevel}`,
    type: 'subclass',
  };
}

export function getSorcererSubclassSummary(value = '', level = 1, edition = '2014') {
  const ruleset = normaliseSorcererRulesEdition(edition);
  const subclass = getSorcererSubclassByKey(value, ruleset);
  const sorcererLevel = Math.max(1, Number(level || 1));
  const featureLevels = getSorcererSubclassFeatureLevels(ruleset);
  const activeFeatures = featureLevels
    .filter(featureLevel => featureLevel <= sorcererLevel)
    .map(featureLevel => buildSubclassFeature(subclass, value, featureLevel));
  const nextLevel = featureLevels.find(featureLevel => featureLevel > sorcererLevel);
  const nextFeatures = nextLevel ? [buildSubclassFeature(subclass, value, nextLevel)] : [];

  return {
    key: subclass?.key || getSorcererSubclassKey(value),
    label: subclass?.label || value || '',
    role: subclass?.role || '',
    summary: subclass?.summary || '',
    ruleset,
    supportedInRuleset: Boolean(!value || subclass),
    activeFeatures,
    nextFeatures,
  };
}
