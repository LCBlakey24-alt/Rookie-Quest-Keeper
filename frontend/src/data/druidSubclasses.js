import { getDruidSubclassFeatureLevels, normaliseDruidRulesEdition } from './druidProgression';

export const DRUID_SUBCLASSES = [
  {
    value: 'Circle of the Land',
    label: 'Circle of the Land',
    key: 'land',
    summary: 'Public-license Druid subclass support focused on terrain-attuned spell support, natural magic, and battlefield control.',
    role: 'Prepared nature caster',
    rulesets: ['2014', '2024'],
    supportedAutomation: true,
  },
  {
    value: 'Custom Druid Subclass',
    label: 'Custom / user-added subclass',
    key: 'custom_druid_subclass',
    summary: 'User-provided Druid circle from private or shared homebrew content.',
    role: 'User-provided Druid circle',
    rulesets: ['2014', '2024'],
    supportedAutomation: false,
    custom: true,
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
      supportedAutomation: Boolean(option.supportedAutomation),
      custom: Boolean(option.custom),
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
  const featureLevels = subclass?.supportedAutomation ? getDruidSubclassFeatureLevels(ruleset) : [];
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
    supportedAutomation: Boolean(subclass?.supportedAutomation),
    custom: Boolean(subclass?.custom),
    activeFeatures,
    nextFeatures,
  };
}
