import { getDruidSubclassFeatureLevels, normaliseDruidRulesEdition } from './druidProgression';

export const DRUID_SUBCLASSES = [
  {
    value: 'Circle of the Land',
    label: 'Circle of the Land',
    key: 'land',
    summary: 'A terrain-attuned Druid focused on flexible spell support, natural magic, and battlefield control.',
    role: 'Prepared nature caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Circle of the Moon',
    label: 'Circle of the Moon',
    key: 'moon',
    summary: 'A shapeshifting Druid who leans into Wild Shape as a front-line combat tool.',
    role: 'Wild Shape bruiser',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Circle of Stars',
    label: 'Circle of Stars',
    key: 'stars',
    summary: 'A star-guided Druid who blends guidance, radiant magic, and adaptable support forms.',
    role: 'Cosmic support caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Circle of the Sea',
    label: 'Circle of the Sea',
    key: 'sea',
    summary: 'A wave-and-storm themed Druid built around movement, elemental pressure, and oceanic magic.',
    role: 'Elemental skirmisher',
    rulesets: ['2024'],
  },
  {
    value: 'Circle of Dreams',
    label: 'Circle of Dreams',
    key: 'dreams',
    summary: 'A fey-touched Druid focused on healing, refuge, and dreamlike support magic.',
    role: 'Fey healer',
    rulesets: ['2014'],
  },
  {
    value: 'Circle of the Shepherd',
    label: 'Circle of the Shepherd',
    key: 'shepherd',
    summary: 'A summoning and spirit-focused Druid who supports allies and calls on nature companions.',
    role: 'Summoner support',
    rulesets: ['2014'],
  },
  {
    value: 'Circle of Spores',
    label: 'Circle of Spores',
    key: 'spores',
    summary: 'A decay-themed Druid who mixes close-range durability, poison flavour, and fungal magic.',
    role: 'Necrotic controller',
    rulesets: ['2014'],
  },
  {
    value: 'Circle of Wildfire',
    label: 'Circle of Wildfire',
    key: 'wildfire',
    summary: 'A fire-and-renewal Druid with a spirit companion, damage pressure, and healing support.',
    role: 'Companion blaster',
    rulesets: ['2014'],
  },
];

export function getDruidSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^druid /, '')
    .replace(/^circle of( the)? /, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getDruidSubclassOptions(edition = '2014') {
  const ruleset = normaliseDruidRulesEdition(edition);
  return DRUID_SUBCLASSES
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

export function getDruidSubclassByKey(value = '', edition = '2014') {
  const key = getDruidSubclassKey(value);
  return getDruidSubclassOptions(edition).find(option => option.key === key || getDruidSubclassKey(option.value) === key) || null;
}

export function isDruidSubclassAvailable(value = '', edition = '2014') {
  return Boolean(getDruidSubclassByKey(value, edition));
}

function buildSubclassFeature(subclass, fallbackValue, featureLevel) {
  const key = subclass?.key || getDruidSubclassKey(fallbackValue) || 'custom';
  const label = subclass?.label || fallbackValue || 'Druid Circle';
  return {
    level: featureLevel,
    key: `${key}_${featureLevel}`,
    name: `${label} Feature ${featureLevel}`,
    type: 'subclass',
  };
}

export function getDruidSubclassSummary(value = '', level = 1, edition = '2014') {
  const ruleset = normaliseDruidRulesEdition(edition);
  const subclass = getDruidSubclassByKey(value, ruleset);
  const druidLevel = Math.max(1, Number(level || 1));
  const featureLevels = getDruidSubclassFeatureLevels(ruleset);
  const activeFeatures = featureLevels
    .filter(featureLevel => featureLevel <= druidLevel)
    .map(featureLevel => buildSubclassFeature(subclass, value, featureLevel));
  const nextLevel = featureLevels.find(featureLevel => featureLevel > druidLevel);
  const nextFeatures = nextLevel ? [buildSubclassFeature(subclass, value, nextLevel)] : [];

  return {
    key: subclass?.key || getDruidSubclassKey(value),
    label: subclass?.label || value || '',
    role: subclass?.role || '',
    summary: subclass?.summary || '',
    ruleset,
    supportedInRuleset: Boolean(!value || subclass),
    activeFeatures,
    nextFeatures,
  };
}
