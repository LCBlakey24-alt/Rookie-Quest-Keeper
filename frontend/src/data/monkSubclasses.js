export const MONK_SUBCLASSES = [
  {
    value: 'Way of the Open Hand',
    label: 'Way of the Open Hand',
    key: 'open_hand',
    summary: 'A direct martial artist focused on control, knockdowns, and improved unarmed combat.',
    role: 'Control striker',
    rulesets: ['2014'],
  },
  {
    value: 'Way of Shadow',
    label: 'Way of Shadow',
    key: 'shadow',
    summary: 'A stealth-focused Monk using darkness, mobility, and ambush tactics.',
    role: 'Stealth skirmisher',
    rulesets: ['2014'],
  },
  {
    value: 'Way of the Four Elements',
    label: 'Way of the Four Elements',
    key: 'four_elements',
    summary: 'A Monk who channels elemental techniques through ki-powered disciplines.',
    role: 'Elemental controller',
    rulesets: ['2014'],
  },
  {
    value: 'Warrior of the Open Hand',
    label: 'Warrior of the Open Hand',
    key: 'open_hand',
    summary: 'A focused martial artist using disciplined strikes and battlefield control.',
    role: 'Control striker',
    rulesets: ['2024'],
  },
  {
    value: 'Warrior of Shadow',
    label: 'Warrior of Shadow',
    key: 'shadow',
    summary: 'A mobile infiltrator who uses shadow techniques and precise movement.',
    role: 'Stealth skirmisher',
    rulesets: ['2024'],
  },
  {
    value: 'Warrior of the Elements',
    label: 'Warrior of the Elements',
    key: 'elements',
    summary: 'A Monk who channels elemental force into strikes, reach, and area control.',
    role: 'Elemental striker',
    rulesets: ['2024'],
  },
  {
    value: 'Warrior of Mercy',
    label: 'Warrior of Mercy',
    key: 'mercy',
    summary: 'A Monk who blends martial discipline with healing, harm, and restorative techniques.',
    role: 'Support striker',
    rulesets: ['2024'],
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
    activeFeatures,
    nextFeatures,
  };
}
