import { BARD_SUBCLASS_FEATURE_LEVELS, normaliseBardRulesEdition } from './bardProgression';

export const BARD_SUBCLASSES = [
  {
    value: 'College of Lore',
    label: 'College of Lore',
    key: 'college_of_lore',
    summary: 'A Bard focused on knowledge, skills, cutting words, and flexible spell choices.',
    role: 'Skill and support specialist',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'College of Valor',
    label: 'College of Valor',
    key: 'college_of_valor',
    summary: 'A battle-ready Bard who supports allies while holding their own in combat.',
    role: 'Combat support',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'College of Glamour',
    label: 'College of Glamour',
    key: 'college_of_glamour',
    summary: 'A fey-touched performer who protects and repositions allies with dazzling presence.',
    role: 'Charm and mobility support',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'College of Dance',
    label: 'College of Dance',
    key: 'college_of_dance',
    summary: 'A mobile Bard who blends performance, movement, and close-range support.',
    role: 'Mobile support',
    rulesets: ['2024'],
  },
  {
    value: 'College of Swords',
    label: 'College of Swords',
    key: 'college_of_swords',
    summary: 'A flashy martial Bard who turns performance into weapon flourishes.',
    role: 'Martial skirmisher',
    rulesets: ['2014'],
  },
  {
    value: 'College of Whispers',
    label: 'College of Whispers',
    key: 'college_of_whispers',
    summary: 'A secretive Bard who weaponises fear, secrets, and social manipulation.',
    role: 'Intrigue striker',
    rulesets: ['2014'],
  },
  {
    value: 'College of Creation',
    label: 'College of Creation',
    key: 'college_of_creation',
    summary: 'A Bard who shapes magical performance into objects, inspiration, and animated support.',
    role: 'Creative support',
    rulesets: ['2014'],
  },
  {
    value: 'College of Eloquence',
    label: 'College of Eloquence',
    key: 'college_of_eloquence',
    summary: 'A silver-tongued Bard who excels at social mastery and reliable inspiration.',
    role: 'Face and support',
    rulesets: ['2014'],
  },
  {
    value: 'College of Spirits',
    label: 'College of Spirits',
    key: 'college_of_spirits',
    summary: 'A supernatural storyteller who channels tales, spirits, and occult support.',
    role: 'Mystic support',
    rulesets: ['2014'],
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

  const activeFeatures = BARD_SUBCLASS_FEATURE_LEVELS
    .filter(featureLevel => featureLevel <= bardLevel)
    .map(featureLevel => ({
      level: featureLevel,
      key: `${subclass?.key || fallbackKey}_${featureLevel}`,
      name: `${subclass?.label || value || 'Bard Subclass'} Feature ${featureLevel}`,
      type: 'subclass',
    }));

  const nextLevel = BARD_SUBCLASS_FEATURE_LEVELS.find(featureLevel => featureLevel > bardLevel);
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
    activeFeatures,
    nextFeatures,
  };
}
