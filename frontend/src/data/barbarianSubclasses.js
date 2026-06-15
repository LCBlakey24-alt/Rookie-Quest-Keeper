function normaliseSubclass(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/path\s+of\s+the\s+/g, '')
    .replace(/path\s+of\s+/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const BARBARIAN_SUBCLASS_FEATURES = {
  berserker: {
    label: 'Path of the Berserker',
    rulesets: ['2014', '2024'],
    features: [
      { level: 3, key: 'frenzy', name: 'Frenzy', summary: 'Spend your rage momentum on a more aggressive attack loop.' },
      { level: 6, key: 'mindless_rage', name: 'Mindless Rage', summary: 'Rage helps keep charm and fear from locking you down.' },
      { level: 10, key: 'intimidating_presence', name: 'Intimidating Presence', summary: 'Turn raw menace into battlefield control.' },
      { level: 14, key: 'retaliation', name: 'Retaliation', summary: 'Punish enemies that damage you in melee.' },
    ],
  },
  totem_warrior: {
    label: 'Path of the Totem Warrior',
    rulesets: ['2014'],
    features: [
      { level: 3, key: 'totem_spirit', name: 'Totem Spirit', summary: 'Pick the rage spirit that defines your combat role.' },
      { level: 6, key: 'aspect_of_the_beast', name: 'Aspect of the Beast', summary: 'Gain exploration and utility gifts from your totem.' },
      { level: 10, key: 'spirit_walker', name: 'Spirit Walker', summary: 'Commune with nature through your spirit guide.' },
      { level: 14, key: 'totemic_attunement', name: 'Totemic Attunement', summary: 'Unlock your final totem combat expression.' },
    ],
  },
  wild_heart: {
    label: 'Path of the Wild Heart',
    rulesets: ['2024'],
    features: [
      { level: 3, key: 'animal_speaker', name: 'Animal Speaker', summary: 'Lean into primal communication and utility.' },
      { level: 3, key: 'rage_of_the_wilds', name: 'Rage of the Wilds', summary: 'Choose a bestial rage benefit for the fight in front of you.' },
      { level: 6, key: 'aspect_of_the_wilds', name: 'Aspect of the Wilds', summary: 'Gain adaptable wilderness and travel tools.' },
      { level: 10, key: 'natures_speaker', name: "Nature's Speaker", summary: 'Deepen your primal connection for exploration scenes.' },
      { level: 14, key: 'power_of_the_wilds', name: 'Power of the Wilds', summary: 'Bring your strongest animal aspect to high-level combat.' },
    ],
  },
  world_tree: {
    label: 'Path of the World Tree',
    rulesets: ['2024'],
    features: [
      { level: 3, key: 'vitality_of_the_tree', name: 'Vitality of the Tree', summary: 'Turn Rage into protective vitality for yourself and allies.' },
      { level: 6, key: 'branches_of_the_tree', name: 'Branches of the Tree', summary: 'Control positioning by pulling creatures through spectral branches.' },
      { level: 10, key: 'battering_roots', name: 'Battering Roots', summary: 'Extend reach and weapon mastery pressure through your roots.' },
      { level: 14, key: 'travel_along_the_tree', name: 'Travel Along the Tree', summary: 'Use World Tree magic for dramatic repositioning.' },
    ],
  },
  zealot: {
    label: 'Path of the Zealot',
    rulesets: ['2024'],
    features: [
      { level: 3, key: 'divine_fury', name: 'Divine Fury', summary: 'Add divine damage while your rage drives the assault.' },
      { level: 3, key: 'warrior_of_the_gods', name: 'Warrior of the Gods', summary: 'Divine power makes you easier to keep in the fight.' },
      { level: 6, key: 'fanatical_focus', name: 'Fanatical Focus', summary: 'Convert zeal into better saves when it matters.' },
      { level: 10, key: 'zealous_presence', name: 'Zealous Presence', summary: 'Inspire nearby allies with battle fervor.' },
      { level: 14, key: 'rage_beyond_death', name: 'Rage Beyond Death', summary: 'Keep fighting past the point where others would fall.' },
    ],
  },
};

export function getBarbarianSubclassKey(value = '') {
  const key = normaliseSubclass(value);
  if (key === 'totem' || key === 'totem_warrior') return 'totem_warrior';
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
  const activeFeatures = data.features.filter(feature => feature.level <= barbarianLevel);
  const nextFeatures = data.features.filter(feature => feature.level > barbarianLevel).slice(0, 2);

  return {
    key,
    label: data.label,
    ruleset,
    activeFeatures,
    nextFeatures,
    supportedInRuleset: data.rulesets.includes(ruleset),
  };
}
