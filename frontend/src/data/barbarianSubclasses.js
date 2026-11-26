import { NON_SRD_SUBCLASS_NOTE } from './licensing/builtInContentPolicy';
const normaliseSubclass = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/path\s+of\s+the\s+/g, '')
  .replace(/path\s+of\s+/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

export const BARBARIAN_SUBCLASS_FEATURES = {
  berserker: {
    label: 'Path of the Berserker',
    rulesets: ['2014', '2024'],
    role: 'direct rage damage and retaliation',
    supportedAutomation: true,
    features: [
      { level: 3, key: 'frenzy', name: 'Frenzy', summary: 'Turn Rage into a more aggressive attack routine.' },
      { level: 6, key: 'mindless_rage', name: 'Mindless Rage', summary: 'Rage helps prevent charm and fear from shutting you down.' },
      { level: 10, key: 'intimidating_presence', name: 'Intimidating Presence', summary: 'Convert primal menace into battlefield control.' },
      { level: 14, key: 'retaliation', name: 'Retaliation', summary: 'Punish nearby enemies that damage you.' },
    ],
  },
  wild_heart: {
    label: 'Path of the Wild Heart',
    rulesets: ['2024'],
    role: NON_SRD_SUBCLASS_NOTE,
    supportedAutomation: false,
    features: [],
  },
  world_tree: {
    label: 'Path of the World Tree',
    rulesets: ['2024'],
    role: NON_SRD_SUBCLASS_NOTE,
    supportedAutomation: false,
    features: [],
  },
  zealot: {
    label: 'Path of the Zealot',
    rulesets: ['2024'],
    role: NON_SRD_SUBCLASS_NOTE,
    supportedAutomation: false,
    features: [],
  },
  custom_barbarian_subclass: {
    label: 'Custom / user-added subclass',
    rulesets: ['2014', '2024'],
    role: 'user-provided Barbarian path',
    supportedAutomation: false,
    custom: true,
    features: [],
  },
};

export function getBarbarianSubclassKey(value = '') {
  const key = normaliseSubclass(value);
  if (key === 'wildheart' || key === 'wild_heart') return 'wild_heart';
  if (key === 'worldtree' || key === 'world_tree') return 'world_tree';
  return key;
}

export function getBarbarianSubclassSummary(subclass = '', level = 1, edition = '2014') {
  const key = getBarbarianSubclassKey(subclass);
  const data = BARBARIAN_SUBCLASS_FEATURES[key];
  if (!data) return null;
  const ruleset = String(edition || '').includes('2024') ? '2024' : '2014';
  const barbarianLevel = Math.max(1, Number(level || 1));

  return {
    key,
    label: data.label,
    role: data.role,
    ruleset,
    supportedInRuleset: data.rulesets.includes(ruleset),
    supportedAutomation: Boolean(data.supportedAutomation),
    custom: Boolean(data.custom),
    activeFeatures: data.features.filter(feature => feature.level <= barbarianLevel),
    nextFeatures: data.features.filter(feature => feature.level > barbarianLevel).slice(0, 2),
  };
}
