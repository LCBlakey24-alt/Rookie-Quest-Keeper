export const MONK_SUBCLASSES = [
  {
    value: 'Way of the Open Hand',
    label: 'Way of the Open Hand',
    key: 'open_hand',
    summary: 'Public-license Monk subclass support focused on direct martial control.',
    role: 'Control striker',
    rulesets: ['2014'],
    supportedAutomation: true,
  },
  {
    value: 'Warrior of the Open Hand',
    label: 'Warrior of the Open Hand',
    key: 'open_hand',
    summary: 'Public-license Monk subclass support focused on disciplined strikes and battlefield control.',
    role: 'Control striker',
    rulesets: ['2024'],
    supportedAutomation: true,
  },
  {
    value: 'Custom Monk Subclass',
    label: 'Custom / user-added subclass',
    key: 'custom_monk_subclass',
    summary: 'Record your own Monk subclass or accepted homebrew without built-in app-provided automation.',
    role: 'User-provided',
    rulesets: ['2014', '2024'],
    supportedAutomation: false,
    custom: true,
  },
];

const MONK_SUBCLASS_FEATURE_LEVELS = [3, 6, 11, 17];

export function getMonkSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^way of( the)? /, '')
    .replace(/^warrior of( the)? /, '')
    .replace(/four elements/, 'four_elements')
    .replace(/open hand/, 'open_hand')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normaliseMonkSubclassRuleset(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getMonkSubclassOptions(edition = '2014') {
  const ruleset = normaliseMonkSubclassRuleset(edition);
  return MONK_SUBCLASSES
    .filter(option => option.rulesets.includes(ruleset))
    .map(option => ({
      value: option.value,
      label: option.label,
      key: option.key,
      summary: option.summary,
      role: option.role,
      ruleset,
      supportedAutomation: option.supportedAutomation,
      custom: Boolean(option.custom),
    }));
}

export function getMonkSubclassByKey(value = '', edition = '2014') {
  const key = getMonkSubclassKey(value);
  return getMonkSubclassOptions(edition).find(option => option.key === key || getMonkSubclassKey(option.value) === key) || null;
}

export function isMonkSubclassAvailable(value = '', edition = '2014') {
  return Boolean(getMonkSubclassByKey(value, edition));
}

export function getMonkSubclassSummary(value = '', level = 1, edition = '2014') {
  const subclass = getMonkSubclassByKey(value, edition);
  const monkLevel = Math.max(1, Number(level || 1));
  const key = subclass?.key || getMonkSubclassKey(value);
  const label = subclass?.label || value || '';

  const activeFeatures = MONK_SUBCLASS_FEATURE_LEVELS
    .filter(featureLevel => featureLevel <= monkLevel)
    .map(featureLevel => ({
      level: featureLevel,
      key: `${key || 'custom'}_${featureLevel}`,
      name: `${label || 'Monk Subclass'} Feature ${featureLevel}`,
      type: 'subclass',
    }));

  const nextLevel = MONK_SUBCLASS_FEATURE_LEVELS.find(featureLevel => featureLevel > monkLevel);
  const nextFeatures = nextLevel ? [{
    level: nextLevel,
    key: `${key || 'custom'}_${nextLevel}`,
    name: `${label || 'Monk Subclass'} Feature ${nextLevel}`,
    type: 'subclass',
  }] : [];

  return {
    key,
    label,
    role: subclass?.role || '',
    summary: subclass?.summary || '',
    supportedInRuleset: Boolean(!value || subclass),
    supportedAutomation: Boolean(subclass?.supportedAutomation),
    custom: Boolean(subclass?.custom),
    activeFeatures,
    nextFeatures,
  };
}
