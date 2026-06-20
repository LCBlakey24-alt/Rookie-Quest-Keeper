import { normaliseMonkRulesEdition, MONK_SUBCLASS_FEATURE_LEVELS } from './monkProgression';

const SUBCLASSES = {
  open_hand: { label: 'Way of the Open Hand', role: 'Control and sustain through Flurry riders, self-healing, calm defense, and a finishing technique.', rulesets: ['2014', '2024'], features: { 3: 'Open Hand Technique', 6: 'Wholeness of Body', 11: 'Tranquility / Fleet Step', 17: 'Quivering Palm' } },
  shadow: { label: 'Way of Shadow', role: 'Stealth, darkness, teleporting from shadows, and opportunistic melee pressure.', rulesets: ['2014', '2024'], features: { 3: 'Shadow Arts', 6: 'Shadow Step', 11: 'Cloak of Shadows / Improved Shadow Step', 17: 'Opportunist / Cloak of Shadows' } },
  elements: { label: 'Way of the Four Elements', role: 'Elemental techniques that add reach, area control, and energy-flavored discipline spenders.', rulesets: ['2014'], features: { 3: 'Disciple of the Elements', 6: 'Elemental Discipline', 11: 'Elemental Discipline', 17: 'Elemental Discipline' } },
  mercy: { label: 'Warrior of Mercy', role: 'Healing, harm, poison pressure, and battlefield support through disciplined strikes.', rulesets: ['2024'], features: { 3: 'Implements of Mercy / Hand of Harm', 6: 'Physician’s Touch', 11: 'Flurry of Healing and Harm', 17: 'Hand of Ultimate Mercy' } },
};

export function getMonkSubclassKey(value = '') {
  const normalised = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (normalised.includes('open')) return 'open_hand';
  if (normalised.includes('shadow')) return 'shadow';
  if (normalised.includes('element')) return 'elements';
  if (normalised.includes('mercy')) return 'mercy';
  return normalised;
}

export function getMonkSubclassOptions(edition = '2014') {
  const ruleset = normaliseMonkRulesEdition(edition);
  return Object.entries(SUBCLASSES).filter(([, item]) => item.rulesets.includes(ruleset)).map(([key, item]) => ({ key, value: item.label, label: item.label, summary: item.role, ruleset }));
}

export function getMonkSubclassSummary(value = '', level = 1, edition = '2014') {
  const key = getMonkSubclassKey(value);
  const subclass = SUBCLASSES[key];
  if (!subclass) return null;
  const monkLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseMonkRulesEdition(edition);
  const features = MONK_SUBCLASS_FEATURE_LEVELS.map(featureLevel => ({ level: featureLevel, key: `${key}_${featureLevel}`, name: subclass.features[featureLevel], summary: subclass.role }));
  return { key, label: subclass.label, role: subclass.role, ruleset, supportedInRuleset: subclass.rulesets.includes(ruleset), activeFeatures: features.filter(feature => feature.level <= monkLevel), nextFeatures: features.filter(feature => feature.level > monkLevel).slice(0, 2) };
}
