// Fighter Fighting Style options for supported rulesets.
// Keep labels and short descriptions here so builder and sheet views agree.

export const FIGHTER_FIGHTING_STYLES_2014 = [
  { key: 'archery', name: 'Archery', ruleset: '2014', description: '+2 bonus to attack rolls you make with ranged weapons.' },
  { key: 'defense', name: 'Defense', ruleset: '2014', description: '+1 AC while wearing armor.' },
  { key: 'dueling', name: 'Dueling', ruleset: '2014', description: '+2 damage when wielding a one-handed melee weapon and no other weapons.' },
  { key: 'great_weapon_fighting', name: 'Great Weapon Fighting', ruleset: '2014', description: 'Reroll 1s and 2s on damage dice for two-handed or versatile melee weapons.' },
  { key: 'protection', name: 'Protection', ruleset: '2014', description: 'Use a reaction to impose disadvantage on an attack against a nearby ally while using a shield.' },
  { key: 'two_weapon_fighting', name: 'Two-Weapon Fighting', ruleset: '2014', description: 'Add your ability modifier to the damage of your off-hand attack.' },
];

export const FIGHTER_FIGHTING_STYLES_2024 = [
  { key: 'archery', name: 'Archery', ruleset: '2024', description: '+2 bonus to attack rolls you make with ranged weapons.' },
  { key: 'blind_fighting', name: 'Blind Fighting', ruleset: '2024', description: 'Gain blindsight within 10 feet.' },
  { key: 'defense', name: 'Defense', ruleset: '2024', description: '+1 AC while wearing armor.' },
  { key: 'dueling', name: 'Dueling', ruleset: '2024', description: '+2 damage when wielding a one-handed melee weapon and no other weapons.' },
  { key: 'great_weapon_fighting', name: 'Great Weapon Fighting', ruleset: '2024', description: 'Treat damage die results of 1 or 2 as 3 for heavy melee weapons.' },
  { key: 'interception', name: 'Interception', ruleset: '2024', description: 'Use a reaction to reduce damage dealt to a nearby ally.' },
  { key: 'protection', name: 'Protection', ruleset: '2024', description: 'Use a reaction with a shield to protect a nearby ally from an attack.' },
  { key: 'superior_technique', name: 'Superior Technique', ruleset: '2024', description: 'Learn one Battle Master maneuver and gain one superiority die.' },
  { key: 'thrown_weapon_fighting', name: 'Thrown Weapon Fighting', ruleset: '2024', description: 'Draw thrown weapons as part of the attack and add damage with thrown weapons.' },
  { key: 'two_weapon_fighting', name: 'Two-Weapon Fighting', ruleset: '2024', description: 'Add your ability modifier to the damage of your extra attack with a light weapon.' },
  { key: 'unarmed_fighting', name: 'Unarmed Fighting', ruleset: '2024', description: 'Improve unarmed strike damage and grappling pressure.' },
];

export function normaliseFightingStyleName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normaliseFightingStyleRuleset(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getFighterFightingStyles(edition = '2014') {
  return normaliseFightingStyleRuleset(edition) === '2024'
    ? FIGHTER_FIGHTING_STYLES_2024
    : FIGHTER_FIGHTING_STYLES_2014;
}

export function getFighterFightingStyleNames(edition = '2014') {
  return getFighterFightingStyles(edition).map(style => style.name);
}

export function findFighterFightingStyle(styleName, edition = '2014') {
  const key = normaliseFightingStyleName(styleName);
  return getFighterFightingStyles(edition).find(style => style.key === key || normaliseFightingStyleName(style.name) === key) || null;
}

export function isValidFighterFightingStyle(styleName, edition = '2014') {
  return Boolean(findFighterFightingStyle(styleName, edition));
}
