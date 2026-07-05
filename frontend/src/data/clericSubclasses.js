export const CLERIC_SUBCLASSES = [
  {
    key: 'life_domain',
    name: 'Life Domain',
    rulesets: ['2014', '2024'],
    role: 'Healing and protective support',
    summary: 'Public-license Cleric subclass support for healing magic, durability, and party sustain.',
    supportedAutomation: true,
    featureLevels: {
      '2014': [1, 2, 6, 8, 17],
      '2024': [3, 6, 17],
    },
  },
  {
    key: 'custom_cleric_subclass',
    name: 'Custom / user-added subclass',
    value: 'Custom Cleric Subclass',
    rulesets: ['2014', '2024'],
    role: 'User-provided Cleric domain',
    summary: 'User-provided Cleric domain from private or shared homebrew content.',
    supportedAutomation: false,
    custom: true,
    featureLevels: {
      '2014': [],
      '2024': [],
    },
  },
];

function normaliseRuleset(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getClericSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^college_of_/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_domain$/, '_domain');
}

export function getClericSubclassOptions(edition = '2014') {
  const ruleset = normaliseRuleset(edition);
  return CLERIC_SUBCLASSES
    .filter(subclass => subclass.rulesets.includes(ruleset))
    .map(subclass => ({
      ...subclass,
      value: subclass.value || subclass.name,
      label: subclass.name,
      ruleset,
      supportedAutomation: Boolean(subclass.supportedAutomation),
      custom: Boolean(subclass.custom),
    }));
}

export function getClericSubclassByKey(key = '', edition = '2014') {
  const subclassKey = getClericSubclassKey(key);
  return getClericSubclassOptions(edition).find(subclass => subclass.key === subclassKey || getClericSubclassKey(subclass.name) === subclassKey) || null;
}

export function isClericSubclassAvailable(key = '', edition = '2014') {
  return Boolean(getClericSubclassByKey(key, edition));
}

export function getClericSubclassSummary(key = '', level = 1, edition = '2014') {
  const subclass = getClericSubclassByKey(key, edition);
  if (!subclass) return null;

  const clericLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseRuleset(edition);
  const featureLevels = Array.isArray(subclass.featureLevels)
    ? subclass.featureLevels
    : (subclass.featureLevels?.[ruleset] || []);
  const activeFeatureLevels = subclass.supportedAutomation ? featureLevels.filter(featureLevel => featureLevel <= clericLevel) : [];
  const nextFeatureLevel = subclass.supportedAutomation ? featureLevels.find(featureLevel => featureLevel > clericLevel) || null : null;

  return {
    ...subclass,
    level: clericLevel,
    activeFeatureLevels,
    nextFeatureLevel,
    supportedInRuleset: subclass.rulesets.includes(ruleset),
    supportedAutomation: Boolean(subclass.supportedAutomation),
    custom: Boolean(subclass.custom),
  };
}
