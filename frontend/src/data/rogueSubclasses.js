import { normaliseRogueRulesEdition, ROGUE_SUBCLASS_FEATURE_LEVELS } from './rogueProgression';

const SUBCLASSES = {
  thief: { label: 'Thief', role: 'Fast hands, climbing, stealth, item use, and late-game extra-turn utility.', rulesets: ['2014', '2024'], features: { 3: 'Fast Hands / Second-Story Work', 9: 'Supreme Sneak', 13: 'Use Magic Device', 17: "Thief's Reflexes" } },
  assassin: { label: 'Assassin', role: 'Opening-round pressure, disguise/infiltration, and lethal ambush tools.', rulesets: ['2014', '2024'], features: { 3: 'Assassinate / Infiltration Expertise', 9: 'Infiltration Expertise / Roving Aim', 13: 'Impostor / Envenom Weapons', 17: 'Death Strike' } },
  arcane_trickster: { label: 'Arcane Trickster', role: 'A Rogue who adds Intelligence spellcasting, legerdemain, and magical ambush play.', rulesets: ['2014', '2024'], features: { 3: 'Spellcasting / Mage Hand Legerdemain', 9: 'Magical Ambush', 13: 'Versatile Trickster', 17: 'Spell Thief' } },
  soulknife: { label: 'Soulknife', role: 'Psionic skill boosts, psychic blades, mobility, and invisibility-style tricks.', rulesets: ['2024'], features: { 3: 'Psionic Power / Psychic Blades', 9: 'Soul Blades', 13: 'Psychic Veil', 17: 'Rend Mind' } },
};

export function getRogueSubclassKey(value = '') {
  const normalised = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (normalised.includes('arcane') || normalised.includes('trickster')) return 'arcane_trickster';
  if (normalised.includes('soul')) return 'soulknife';
  if (normalised.includes('assassin')) return 'assassin';
  if (normalised.includes('thief')) return 'thief';
  return normalised;
}

export function getRogueSubclassOptions(edition = '2014') {
  const ruleset = normaliseRogueRulesEdition(edition);
  return Object.entries(SUBCLASSES)
    .filter(([, item]) => item.rulesets.includes(ruleset))
    .map(([key, item]) => ({ key, value: item.label, label: item.label, summary: item.role, ruleset }));
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
  }));
  return {
    key,
    label: subclass.label,
    role: subclass.role,
    ruleset,
    supportedInRuleset: subclass.rulesets.includes(ruleset),
    activeFeatures: features.filter(feature => feature.level <= rogueLevel),
    nextFeatures: features.filter(feature => feature.level > rogueLevel).slice(0, 2),
  };
}
