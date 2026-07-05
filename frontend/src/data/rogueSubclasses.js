import { normaliseRogueRulesEdition, ROGUE_SUBCLASS_FEATURE_LEVELS } from './rogueProgression';

const SUBCLASSES = {
  thief: {
    label: 'Thief',
    role: 'Public-license Rogue subclass support for mobility, skill tricks, and item use.',
    rulesets: ['2014', '2024'],
    supportedAutomation: true,
    features: { 3: 'Fast Hands / Second-Story Work', 9: 'Supreme Sneak', 13: 'Use Magic Device', 17: "Thief's Reflexes" },
  },
  custom_rogue_subclass: {
    label: 'Custom / user-added subclass',
    role: 'User-provided Rogue archetype.',
    rulesets: ['2014', '2024'],
    supportedAutomation: false,
    custom: true,
    features: {},
  },
};

export function getRogueSubclassKey(value = '') {
  const normalised = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (normalised.includes('thief')) return 'thief';
  return normalised;
}

export function getRogueSubclassOptions(edition = '2014') {
  const ruleset = normaliseRogueRulesEdition(edition);
  return Object.entries(SUBCLASSES)
    .filter(([, item]) => item.rulesets.includes(ruleset))
    .map(([key, item]) => ({
      key,
      value: key === 'custom_rogue_subclass' ? 'Custom Rogue Subclass' : item.label,
      label: item.label,
      summary: item.role,
      ruleset,
      supportedAutomation: item.supportedAutomation,
      custom: Boolean(item.custom),
    }));
}

export function getRogueSubclassSummary(value = '', level = 1, edition = '2014') {
  const key = getRogueSubclassKey(value);
  const subclass = SUBCLASSES[key];
  if (!subclass) return null;
  const rogueLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseRogueRulesEdition(edition);
  const features = ROGUE_SUBCLASS_FEATURE_LEVELS.map(featureLevel => ({
    level: featureLevel,
    key: `${key}_${featureLevel}`,
    name: subclass.features[featureLevel],
    summary: subclass.role,
  })).filter(feature => feature.name);
  return {
    key,
    label: subclass.label,
    role: subclass.role,
    ruleset,
    supportedInRuleset: subclass.rulesets.includes(ruleset),
    supportedAutomation: Boolean(subclass.supportedAutomation),
    custom: Boolean(subclass.custom),
    activeFeatures: features.filter(feature => feature.level <= rogueLevel),
    nextFeatures: features.filter(feature => feature.level > rogueLevel).slice(0, 2),
  };
}
