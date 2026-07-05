import { BARD_SUBCLASS_FEATURE_LEVELS, normaliseBardRulesEdition } from './bardProgression';

export const BARD_SUBCLASSES = [
  {
    value: 'College of Lore',
    label: 'College of Lore',
    key: 'college_of_lore',
    summary: 'Public-license Bard subclass support focused on knowledge, skills, Cutting Words, and flexible spell choices.',
    role: 'Skill and support specialist',
    rulesets: ['2014', '2024'],
    supportedAutomation: true,
  },
  {
    value: 'Custom Bard Subclass',
    label: 'Custom / user-added subclass',
    key: 'custom_bard_subclass',
    summary: 'User-provided Bard college from private or shared homebrew content.',
    role: 'User-provided Bard college',
    rulesets: ['2014', '2024'],
    supportedAutomation: false,
    custom: true,
  },
];

export function getBardSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^bard /, '')
    .replace(/^college of /, 'college_of_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getBardSubclassOptions(edition = '2014') {
  const ruleset = normaliseBardRulesEdition(edition);
  return BARD_SUBCLASSES
    .filter(option => option.rulesets.includes(ruleset))
    .map(option => ({
      value: option.value,
      label: option.label,
      key: option.key,
      summary: option.summary,
      role: option.role,
      ruleset,
      supportedAutomation: Boolean(option.supportedAutomation),
      custom: Boolean(option.custom),
    }));
}

export function getBardSubclassByKey(value = '', edition = '2014') {
  const key = getBardSubclassKey(value);
  return getBardSubclassOptions(edition).find(option => option.key === key || getBardSubclassKey(option.value) === key) || null;
}

export function isBardSubclassAvailable(value = '', edition = '2014') {
  return Boolean(getBardSubclassByKey(value, edition));
}

export function getBardSubclassSummary(value = '', level = 1, edition = '2014') {
  const subclass = getBardSubclassByKey(value, edition);
  const bardLevel = Math.max(1, Number(level || 1));
  const fallbackKey = getBardSubclassKey(value) || 'custom';

  const featureLevels = subclass?.supportedAutomation ? BARD_SUBCLASS_FEATURE_LEVELS : [];
  const activeFeatures = featureLevels
    .filter(featureLevel => featureLevel <= bardLevel)
    .map(featureLevel => ({
      level: featureLevel,
      key: `${subclass?.key || fallbackKey}_${featureLevel}`,
      name: `${subclass?.label || value || 'Bard Subclass'} Feature ${featureLevel}`,
      type: 'subclass',
    }));

  const nextLevel = featureLevels.find(featureLevel => featureLevel > bardLevel);
  const nextFeatures = nextLevel ? [{
    level: nextLevel,
    key: `${subclass?.key || fallbackKey}_${nextLevel}`,
    name: `${subclass?.label || value || 'Bard Subclass'} Feature ${nextLevel}`,
    type: 'subclass',
  }] : [];

  return {
    key: subclass?.key || getBardSubclassKey(value),
    label: subclass?.label || value || '',
    role: subclass?.role || '',
    summary: subclass?.summary || '',
    supportedInRuleset: Boolean(!value || subclass),
    supportedAutomation: Boolean(subclass?.supportedAutomation),
    custom: Boolean(subclass?.custom),
    activeFeatures,
    nextFeatures,
  };
}
