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
    role: 'flexible bestial rage benefits',
    supportedAutomation: true,
    features: [
      { level: 3, key: 'animal_speaker', name: 'Animal Speaker', summary: 'Bring primal communication into exploration scenes.' },
      { level: 3, key: 'rage_of_the_wilds', name: 'Rage of the Wilds', summary: 'Choose a bestial rage benefit for the current fight.' },
      { level: 6, key: 'aspect_of_the_wilds', name: 'Aspect of the Wilds', summary: 'Gain adaptable wilderness tools.' },
      { level: 10, key: 'natures_speaker', name: "Nature's Speaker", summary: 'Deepen your primal connection outside combat.' },
      { level: 14, key: 'power_of_the_wilds', name: 'Power of the Wilds', summary: 'Bring your strongest animal aspect to high-level combat.' },
    ],
  },
  world_tree: {
    label: 'Path of the World Tree',
    rulesets: ['2024'],
    role: 'protection, reach, and repositioning',
    supportedAutomation: true,
    features: [
      { level: 3, key: 'vitality_of_the_tree', name: 'Vitality of the Tree', summary: 'Turn Rage into protective vitality.' },
      { level: 6, key: 'branches_of_the_tree', name: 'Branches of the Tree', summary: 'Pull creatures through spectral branches.' },
      { level: 10, key: 'battering_roots', name: 'Battering Roots', summary: 'Extend reach and mastery pressure.' },
      { level: 14, key: 'travel_along_the_tree', name: 'Travel Along the Tree', summary: 'Use World Tree magic for dramatic repositioning.' },
    ],
  },
  zealot: {
    label: 'Path of the Zealot',
    rulesets: ['2024'],
    role: 'divine rage damage and staying power',
    supportedAutomation: true,
    features: [
      { level: 3, key: 'divine_fury', name: 'Divine Fury', summary: 'Add divine damage while Rage drives the assault.' },
      { level: 3, key: 'warrior_of_the_gods', name: 'Warrior of the Gods', summary: 'Divine power helps keep you in the fight.' },
      { level: 6, key: 'fanatical_focus', name: 'Fanatical Focus', summary: 'Convert zeal into better saves.' },
      { level: 10, key: 'zealous_presence', name: 'Zealous Presence', summary: 'Inspire nearby allies with battle fervor.' },
      { level: 14, key: 'rage_beyond_death', name: 'Rage Beyond Death', summary: 'Keep fighting past the point others would fall.' },
    ],
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
