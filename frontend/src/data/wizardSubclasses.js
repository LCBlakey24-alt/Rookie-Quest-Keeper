import { getWizardSubclassFeatureLevels, normaliseWizardRulesEdition } from './wizardProgression';

export const WIZARD_SUBCLASSES = [
  {
    value: 'School of Abjuration',
    label: 'School of Abjuration',
    key: 'abjuration',
    summary: 'A protective Wizard focused on wards, magical defence, and keeping allies safe.',
    role: 'Defensive warder',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'School of Divination',
    label: 'School of Divination',
    key: 'divination',
    summary: 'A foresight-focused Wizard who leans into information, prediction, and changing key moments.',
    role: 'Fate reader',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'School of Evocation',
    label: 'School of Evocation',
    key: 'evocation',
    summary: 'A battle-mage Wizard built around direct magical force and safer area damage.',
    role: 'Arcane blaster',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'School of Illusion',
    label: 'School of Illusion',
    key: 'illusion',
    summary: 'A deception-focused Wizard who bends perception, misdirects enemies, and shapes the battlefield with falsehoods.',
    role: 'Trickery controller',
    rulesets: ['2014', '2024'],
  },
  {
    value: 'School of Conjuration',
    label: 'School of Conjuration',
    key: 'conjuration',
    summary: 'A summoning and teleportation Wizard focused on calling objects, creatures, and movement magic.',
    role: 'Summoner mover',
    rulesets: ['2014'],
  },
  {
    value: 'School of Enchantment',
    label: 'School of Enchantment',
    key: 'enchantment',
    summary: 'A mind-magic Wizard who manipulates attention, influence, and enemy behaviour.',
    role: 'Mind controller',
    rulesets: ['2014'],
  },
  {
    value: 'School of Necromancy',
    label: 'School of Necromancy',
    key: 'necromancy',
    summary: 'A death-magic Wizard focused on draining life, controlling undead themes, and grim resilience.',
    role: 'Death scholar',
    rulesets: ['2014'],
  },
  {
    value: 'School of Transmutation',
    label: 'School of Transmutation',
    key: 'transmutation',
    summary: 'A transformation Wizard focused on changing materials, bodies, and battlefield possibilities.',
    role: 'Arcane alchemist',
    rulesets: ['2014'],
  },
];

export function getWizardSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^wizard /, '')
    .replace(/^school of /, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getWizardSubclassOptions(edition = '2014') {
  const ruleset = normaliseWizardRulesEdition(edition);
  return WIZARD_SUBCLASSES
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

export function getWizardSubclassByKey(value = '', edition = '2014') {
  const key = getWizardSubclassKey(value);
  return getWizardSubclassOptions(edition).find(option => option.key === key || getWizardSubclassKey(option.value) === key) || null;
}

export function isWizardSubclassAvailable(value = '', edition = '2014') {
  return Boolean(getWizardSubclassByKey(value, edition));
}

function buildSubclassFeature(subclass, fallbackValue, featureLevel) {
  const key = subclass?.key || getWizardSubclassKey(fallbackValue) || 'custom';
  const label = subclass?.label || fallbackValue || 'Wizard Subclass';
  return {
    level: featureLevel,
    key: `${key}_${featureLevel}`,
    name: `${label} Feature ${featureLevel}`,
    type: 'subclass',
  };
}

export function getWizardSubclassSummary(value = '', level = 1, edition = '2014') {
  const ruleset = normaliseWizardRulesEdition(edition);
  const subclass = getWizardSubclassByKey(value, ruleset);
  const wizardLevel = Math.max(1, Number(level || 1));
  const featureLevels = getWizardSubclassFeatureLevels(ruleset);
  const activeFeatures = featureLevels
    .filter(featureLevel => featureLevel <= wizardLevel)
    .map(featureLevel => buildSubclassFeature(subclass, value, featureLevel));
  const nextLevel = featureLevels.find(featureLevel => featureLevel > wizardLevel);
  const nextFeatures = nextLevel ? [buildSubclassFeature(subclass, value, nextLevel)] : [];

  return {
    key: subclass?.key || getWizardSubclassKey(value),
    label: subclass?.label || value || '',
    role: subclass?.role || '',
    summary: subclass?.summary || '',
    ruleset,
    supportedInRuleset: Boolean(!value || subclass),
    activeFeatures,
    nextFeatures,
  };
}
