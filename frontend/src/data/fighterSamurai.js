// Samurai Fighter helpers for app unlocks, sheet display, and resource reminders.
// Short summaries only: this file tracks app-level automation, not full rules text.

export const SAMURAI_FEATURES_2014 = [
  { level: 3, key: 'bonus_proficiency', name: 'Bonus Proficiency', type: 'choice', choiceType: 'skill_or_language', description: 'Record the extra social skill or language choice granted by the subclass.' },
  { level: 3, key: 'fighting_spirit', name: 'Fighting Spirit', type: 'resource', description: 'Spend a limited-use combat boost when you need a focused turn.' },
  { level: 7, key: 'elegant_courtier', name: 'Elegant Courtier', type: 'passive', description: 'Improve social presence and gain additional mental resilience.' },
  { level: 10, key: 'tireless_spirit', name: 'Tireless Spirit', type: 'resource_recovery', description: 'Regain one use of Fighting Spirit when combat begins and you have none.' },
  { level: 15, key: 'rapid_strike', name: 'Rapid Strike', type: 'combat', description: 'Trade a strong opening for an additional weapon strike when the situation allows.' },
  { level: 18, key: 'strength_before_death', name: 'Strength Before Death', type: 'reaction', description: 'Make a last stand when a hit would drop you.' },
];

export function normaliseSamuraiSubclass(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function isSamuraiSubclass(value = '') {
  return ['samurai', 'fighter_samurai'].includes(normaliseSamuraiSubclass(value));
}

export function getSamuraiFeaturesForLevel(level = 1) {
  const fighterLevel = Math.max(1, Number(level || 1));
  return SAMURAI_FEATURES_2014.filter(feature => feature.level === fighterLevel);
}

export function getActiveSamuraiFeatures(level = 1) {
  const fighterLevel = Math.max(1, Number(level || 1));
  return SAMURAI_FEATURES_2014.filter(feature => feature.level <= fighterLevel);
}

export function getSamuraiFightingSpiritUses(level = 1) {
  return Number(level || 1) >= 3 ? 3 : 0;
}

export function getSamuraiSummary(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return {
    edition: String(edition || '').includes('2024') ? '2024' : '2014',
    level: fighterLevel,
    fightingSpiritUses: getSamuraiFightingSpiritUses(fighterLevel),
    currentLevelFeatures: getSamuraiFeaturesForLevel(fighterLevel),
    activeFeatures: getActiveSamuraiFeatures(fighterLevel),
  };
}
