// Champion Fighter helpers for supported rulesets.
// Short summaries only: this file is for app unlocks and sheet/builder display.

export function normaliseChampionRuleset(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function normaliseSubclassName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function isChampionSubclass(value = '') {
  return ['champion', 'champion_fighter', 'fighter_champion'].includes(normaliseSubclassName(value));
}

export function getChampionCriticalRange(level = 1) {
  const fighterLevel = Math.max(1, Number(level || 1));
  if (fighterLevel >= 15) return { minimum: 18, label: '18–20' };
  if (fighterLevel >= 3) return { minimum: 19, label: '19–20' };
  return { minimum: 20, label: '20' };
}

const CHAMPION_FEATURES_2014 = [
  { level: 3, key: 'improved_critical', name: 'Improved Critical', type: 'passive', description: 'Weapon attacks score a critical hit on 19–20.' },
  { level: 7, key: 'remarkable_athlete', name: 'Remarkable Athlete', type: 'passive', description: 'Gain a bonus to physical checks you are not already proficient in, and improve running jumps.' },
  { level: 10, key: 'additional_fighting_style', name: 'Additional Fighting Style', type: 'choice', choiceType: 'fighting_style', description: 'Choose a second Fighting Style.' },
  { level: 15, key: 'superior_critical', name: 'Superior Critical', type: 'passive', description: 'Weapon attacks score a critical hit on 18–20.' },
  { level: 18, key: 'survivor', name: 'Survivor', type: 'passive', description: 'Regain hit points at the start of your turn when badly wounded.' },
];

const CHAMPION_FEATURES_2024 = [
  { level: 3, key: 'improved_critical', name: 'Improved Critical', type: 'passive', description: 'Weapon and unarmed attacks score a critical hit on 19–20.' },
  { level: 3, key: 'remarkable_athlete', name: 'Remarkable Athlete', type: 'passive', description: 'Improve physical checks and initiative reliability.' },
  { level: 7, key: 'additional_fighting_style', name: 'Additional Fighting Style', type: 'choice', choiceType: 'fighting_style', description: 'Choose an additional Fighting Style option.' },
  { level: 10, key: 'heroic_warrior', name: 'Heroic Warrior', type: 'passive', description: 'Gain a reliable heroic boost during combat.' },
  { level: 15, key: 'superior_critical', name: 'Superior Critical', type: 'passive', description: 'Attacks score a critical hit on 18–20.' },
  { level: 18, key: 'survivor', name: 'Survivor', type: 'passive', description: 'Regain hit points at the start of your turn when badly wounded.' },
];

export function getChampionProgression(edition = '2014') {
  return normaliseChampionRuleset(edition) === '2024' ? CHAMPION_FEATURES_2024 : CHAMPION_FEATURES_2014;
}

export function getChampionFeaturesForLevel(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return getChampionProgression(edition).filter(feature => feature.level === fighterLevel);
}

export function getActiveChampionFeatures(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return getChampionProgression(edition).filter(feature => feature.level <= fighterLevel);
}

export function getChampionChoicesForLevel(level = 1, edition = '2014') {
  return getChampionFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getChampionSummary(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return {
    edition: normaliseChampionRuleset(edition),
    level: fighterLevel,
    criticalRange: getChampionCriticalRange(fighterLevel),
    currentLevelFeatures: getChampionFeaturesForLevel(fighterLevel, edition),
    activeFeatures: getActiveChampionFeatures(fighterLevel, edition),
    choicesThisLevel: getChampionChoicesForLevel(fighterLevel, edition),
  };
}
