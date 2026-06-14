// Battle Master Fighter helpers for app unlocks, sheet display, and builder validation.

export const BATTLE_MASTER_FEATURES_2014 = [
  { level: 3, key: 'combat_superiority', name: 'Combat Superiority', type: 'resource', description: 'Gain superiority dice and maneuvers.' },
  { level: 3, key: 'student_of_war', name: 'Student of War', type: 'choice', choiceType: 'artisan_tool', description: 'Gain one artisan tool proficiency.' },
  { level: 7, key: 'know_your_enemy', name: 'Know Your Enemy', type: 'utility', description: 'Study a creature to learn broad combat information.' },
  { level: 10, key: 'improved_combat_superiority_d10', name: 'Improved Combat Superiority', type: 'resource_upgrade', die: 10, description: 'Superiority dice become d10s.' },
  { level: 15, key: 'relentless', name: 'Relentless', type: 'resource_recovery', description: 'Regain a superiority die when you have none at initiative.' },
  { level: 18, key: 'improved_combat_superiority_d12', name: 'Improved Combat Superiority (d12)', type: 'resource_upgrade', die: 12, description: 'Superiority dice become d12s.' },
];

export const BATTLE_MASTER_FEATURES_2024 = [
  { level: 3, key: 'combat_superiority', name: 'Combat Superiority', type: 'resource', description: 'Gain superiority dice and maneuvers.' },
  { level: 3, key: 'student_of_war', name: 'Student of War', type: 'choice', choiceType: 'tool_proficiency', description: 'Gain one tool proficiency.' },
  { level: 7, key: 'know_your_enemy', name: 'Know Your Enemy', type: 'utility', description: 'Read an enemy and learn tactical information.' },
  { level: 10, key: 'improved_combat_superiority_d10', name: 'Improved Combat Superiority', type: 'resource_upgrade', die: 10, description: 'Superiority dice become d10s.' },
  { level: 15, key: 'relentless', name: 'Relentless', type: 'resource_recovery', description: 'Regain a superiority die when combat begins if you have none.' },
  { level: 18, key: 'improved_combat_superiority_d12', name: 'Improved Combat Superiority (d12)', type: 'resource_upgrade', die: 12, description: 'Superiority dice become d12s.' },
];

export function normaliseBattleMasterRuleset(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function normaliseBattleMasterSubclass(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function isBattleMasterSubclass(value = '') {
  return ['battle_master', 'battlemaster', 'fighter_battle_master'].includes(normaliseBattleMasterSubclass(value));
}

export function getBattleMasterSuperiorityDie(level = 1) {
  const fighterLevel = Math.max(1, Number(level || 1));
  if (fighterLevel >= 18) return 12;
  if (fighterLevel >= 10) return 10;
  return 8;
}

export function getBattleMasterSuperiorityDiceCount(level = 1) {
  const fighterLevel = Math.max(1, Number(level || 1));
  if (fighterLevel >= 15) return 6;
  if (fighterLevel >= 7) return 5;
  if (fighterLevel >= 3) return 4;
  return 0;
}

export function getBattleMasterManeuverCount(level = 1) {
  const fighterLevel = Math.max(1, Number(level || 1));
  if (fighterLevel >= 15) return 9;
  if (fighterLevel >= 10) return 7;
  if (fighterLevel >= 7) return 5;
  if (fighterLevel >= 3) return 3;
  return 0;
}

export function getBattleMasterProgression(edition = '2014') {
  return normaliseBattleMasterRuleset(edition) === '2024' ? BATTLE_MASTER_FEATURES_2024 : BATTLE_MASTER_FEATURES_2014;
}

export function getBattleMasterFeaturesForLevel(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return getBattleMasterProgression(edition).filter(feature => feature.level === fighterLevel);
}

export function getActiveBattleMasterFeatures(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return getBattleMasterProgression(edition).filter(feature => feature.level <= fighterLevel);
}

export function getBattleMasterSummary(level = 1, edition = '2014') {
  const fighterLevel = Math.max(1, Number(level || 1));
  return {
    edition: normaliseBattleMasterRuleset(edition),
    level: fighterLevel,
    superiorityDie: getBattleMasterSuperiorityDie(fighterLevel),
    superiorityDice: getBattleMasterSuperiorityDiceCount(fighterLevel),
    maneuverCount: getBattleMasterManeuverCount(fighterLevel),
    currentLevelFeatures: getBattleMasterFeaturesForLevel(fighterLevel, edition),
    activeFeatures: getActiveBattleMasterFeatures(fighterLevel, edition),
  };
}
