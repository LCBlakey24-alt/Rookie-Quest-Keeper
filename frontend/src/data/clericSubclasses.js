export const CLERIC_SUBCLASSES = [
  {
    key: 'life_domain',
    name: 'Life Domain',
    rulesets: ['2014', '2024'],
    role: 'Healing and protective support',
    summary: 'Boosts healing magic, durability, and party sustain.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'light_domain',
    name: 'Light Domain',
    rulesets: ['2014', '2024'],
    role: 'Radiant blaster and defensive support',
    summary: 'Uses fire and light magic to punish enemies and protect allies.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'trickery_domain',
    name: 'Trickery Domain',
    rulesets: ['2014', '2024'],
    role: 'Illusion, stealth, and misdirection support',
    summary: 'Adds stealth, deception, and duplicate-based divine tricks.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'war_domain',
    name: 'War Domain',
    rulesets: ['2014', '2024'],
    role: 'Martial divine striker',
    summary: 'Blends weapon pressure, battle blessings, and combat durability.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'knowledge_domain',
    name: 'Knowledge Domain',
    rulesets: ['2014'],
    role: 'Skill and lore specialist',
    summary: 'Adds expertise-style knowledge, languages, and mind-affecting utility.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'nature_domain',
    name: 'Nature Domain',
    rulesets: ['2014'],
    role: 'Nature-themed divine controller',
    summary: 'Adds druidic flavour, elemental protection, and nature control.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'tempest_domain',
    name: 'Tempest Domain',
    rulesets: ['2014'],
    role: 'Storm damage and battlefield control',
    summary: 'Leans into thunder, lightning, martial armour, and retaliation.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'forge_domain',
    name: 'Forge Domain',
    rulesets: ['2014'],
    role: 'Armour, crafting, and fire resilience',
    summary: 'Improves equipment, defence, fire power, and magical craftsmanship.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'grave_domain',
    name: 'Grave Domain',
    rulesets: ['2014'],
    role: 'Death warding and burst setup support',
    summary: 'Protects the dying, disrupts death, and marks enemies for punishment.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'peace_domain',
    name: 'Peace Domain',
    rulesets: ['2014'],
    role: 'Bonding and defensive support',
    summary: 'Creates powerful ally bonds, shared protection, and team support.',
    featureLevels: [1, 2, 6, 8, 17],
  },
  {
    key: 'twilight_domain',
    name: 'Twilight Domain',
    rulesets: ['2014'],
    role: 'Protective aura and darkness support',
    summary: 'Protects allies with twilight sanctuary, darkvision, and night-themed magic.',
    featureLevels: [1, 2, 6, 8, 17],
  },
];

function normaliseRuleset(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getClericSubclassKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^college_of_/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_domain$/, '_domain');
}

export function getClericSubclassOptions(edition = '2014') {
  const ruleset = normaliseRuleset(edition);
  return CLERIC_SUBCLASSES.filter(subclass => subclass.rulesets.includes(ruleset));
}

export function getClericSubclassByKey(key = '', edition = '2014') {
  const subclassKey = getClericSubclassKey(key);
  return getClericSubclassOptions(edition).find(subclass => subclass.key === subclassKey || getClericSubclassKey(subclass.name) === subclassKey) || null;
}

export function isClericSubclassAvailable(key = '', edition = '2014') {
  return Boolean(getClericSubclassByKey(key, edition));
}

export function getClericSubclassSummary(key = '', level = 1, edition = '2014') {
  const subclass = getClericSubclassByKey(key, edition);
  if (!subclass) return null;

  const clericLevel = Math.max(1, Number(level || 1));
  const activeFeatureLevels = subclass.featureLevels.filter(featureLevel => featureLevel <= clericLevel);
  const nextFeatureLevel = subclass.featureLevels.find(featureLevel => featureLevel > clericLevel) || null;

  return {
    ...subclass,
    level: clericLevel,
    activeFeatureLevels,
    nextFeatureLevel,
    supportedInRuleset: subclass.rulesets.includes(normaliseRuleset(edition)),
  };
}
