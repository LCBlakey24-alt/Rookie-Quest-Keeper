import { getWarlockSubclassFeatureLevels, normaliseWarlockRulesEdition } from './warlockProgression';

export const WARLOCK_SUBCLASSES = [
  {
    value: 'Archfey Patron',
    label: 'Archfey Patron',
    key: 'archfey',
    summary: 'A Warlock patron option focused on charm, mobility, and tricky magic.',
    role: 'Trickery caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Fiend Patron',
    label: 'Fiend Patron',
    key: 'fiend',
    summary: 'A Warlock patron option focused on damage, resilience, and bold magic.',
    role: 'Damage caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Great Old One Patron',
    label: 'Great Old One Patron',
    key: 'great_old_one',
    summary: 'A Warlock patron option focused on mind magic, secrets, and control.',
    role: 'Mind caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Celestial Patron',
    label: 'Celestial Patron',
    key: 'celestial',
    summary: 'A Warlock patron option focused on healing, light, and support.',
    role: 'Support caster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'Hexblade Patron',
    label: 'Hexblade Patron',
    key: 'hexblade',
    summary: 'A Warlock patron option focused on weapon use and close-range pressure.',
    role: 'Weapon caster',
    rulesets: ['2014'],
  },
  {
    value: 'Fathomless Patron',
    label: 'Fathomless Patron',
    key: 'fathomless',
    summary: 'A Warlock patron option focused on water themes and control.',
    role: 'Control caster',
    rulesets: ['2014'],
  },
  {
    value: 'Genie Patron',
    label: 'Genie Patron',
    key: 'genie',
    summary: 'A Warlock patron option focused on elemental themes and utility.',
    role: 'Elemental caster',
    rulesets: ['2014'],
  },
  {
    value: 'Undead Patron',
    label: 'Undead Patron',
    key: 'undead',
    summary: 'A Warlock patron option focused on fear, endurance, and grave themes.',
    role: 'Dread caster',
    rulesets: ['2014'],
  },
];

export function getWarlockSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^the /, '')
    .replace(/ patron$/, '')
    .replace(/^patron of /, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getWarlockSubclassOptions(edition = '2014') {
  const ruleset = normaliseWarlockRulesEdition(edition);
  return WARLOCK_SUBCLASSES
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

export function getWarlockSubclassByKey(value = '', edition = '2014') {
  const key = getWarlockSubclassKey(value);
  return getWarlockSubclassOptions(edition).find(option => option.key === key || getWarlockSubclassKey(option.value) === key) || null;
}

export function isWarlockSubclassAvailable(value = '', edition = '2014') {
  return Boolean(getWarlockSubclassByKey(value, edition));
}

function buildSubclassFeature(subclass, fallbackValue, featureLevel) {
  const key = subclass?.key || getWarlockSubclassKey(fallbackValue) || 'custom';
  const label = subclass?.label || fallbackValue || 'Warlock Patron';
  return {
    level: featureLevel,
    key: `${key}_${featureLevel}`,
    name: `${label} Feature ${featureLevel}`,
    type: 'subclass',
  };
}

export function getWarlockSubclassSummary(value = '', level = 1, edition = '2014') {
  const ruleset = normaliseWarlockRulesEdition(edition);
  const subclass = getWarlockSubclassByKey(value, ruleset);
  const warlockLevel = Math.max(1, Number(level || 1));
  const featureLevels = getWarlockSubclassFeatureLevels(ruleset);
  const activeFeatures = featureLevels
    .filter(featureLevel => featureLevel <= warlockLevel)
    .map(featureLevel => buildSubclassFeature(subclass, value, featureLevel));
  const nextLevel = featureLevels.find(featureLevel => featureLevel > warlockLevel);
  const nextFeatures = nextLevel ? [buildSubclassFeature(subclass, value, nextLevel)] : [];

  return {
    key: subclass?.key || getWarlockSubclassKey(value),
    label: subclass?.label || value || '',
    role: subclass?.role || '',
    summary: subclass?.summary || '',
    ruleset,
    supportedInRuleset: Boolean(!value || subclass),
    activeFeatures,
    nextFeatures,
  };
}
