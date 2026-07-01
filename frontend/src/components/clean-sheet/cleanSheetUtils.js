import { Activity, Backpack, BookOpen, Edit3, ListChecks, Swords } from 'lucide-react';

export const ABILITIES = [
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['intelligence', 'INT'],
  ['wisdom', 'WIS'],
  ['charisma', 'CHA'],
];

export const SKILLS = [
  ['Acrobatics', 'dexterity'], ['Animal Handling', 'wisdom'], ['Arcana', 'intelligence'],
  ['Athletics', 'strength'], ['Deception', 'charisma'], ['History', 'intelligence'],
  ['Insight', 'wisdom'], ['Intimidation', 'charisma'], ['Investigation', 'intelligence'],
  ['Medicine', 'wisdom'], ['Nature', 'intelligence'], ['Perception', 'wisdom'],
  ['Performance', 'charisma'], ['Persuasion', 'charisma'], ['Religion', 'intelligence'],
  ['Sleight of Hand', 'dexterity'], ['Stealth', 'dexterity'], ['Survival', 'wisdom'],
];

export const PASSIVE_SKILLS = [
  ['Perception', 'wisdom'],
  ['Insight', 'wisdom'],
  ['Investigation', 'intelligence'],
];

export const COMMON_CONDITIONS = [
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
];

export const SHEET_TABS = [
  { id: 'stats', label: 'Stats', icon: Activity },
  { id: 'actions', label: 'Actions', icon: Swords },
  { id: 'inventory', label: 'Inventory', icon: Backpack },
  { id: 'spells', label: 'Spells', icon: BookOpen },
  { id: 'features', label: 'Features', icon: ListChecks },
  { id: 'notes', label: 'Notes', icon: Edit3 },
];

export const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
export const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);
export const getMaxHp = (character) => Number(character?.max_hit_points ?? character?.max_hp ?? 10) || 10;
export const getCurrentHp = (character) => Number(character?.current_hit_points ?? character?.hp ?? getMaxHp(character)) || getMaxHp(character);
export const getTempHp = (character) => Number(character?.temporary_hit_points ?? character?.temp_hp ?? 0) || 0;
export const clampDeathCount = (value) => Math.max(0, Math.min(3, Number(value) || 0));

export function calculateHpDamage({ currentHp = 0, tempHp = 0, maxHp = 1, amount = 0 } = {}) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const safeTempHp = Math.max(0, Number(tempHp) || 0);
  const safeCurrentHp = Math.max(0, Math.min(Number(maxHp) || 1, Number(currentHp) || 0));
  const tempAbsorbed = Math.min(safeTempHp, safeAmount);
  const remainingDamage = Math.max(0, safeAmount - tempAbsorbed);
  const nextTempHp = Math.max(0, safeTempHp - tempAbsorbed);
  const nextCurrentHp = Math.max(0, safeCurrentHp - remainingDamage);

  return {
    current_hit_points: nextCurrentHp,
    temporary_hit_points: nextTempHp,
    temp_hp: nextTempHp,
    tempAbsorbed,
    hpDamage: safeCurrentHp - nextCurrentHp,
    totalApplied: tempAbsorbed + (safeCurrentHp - nextCurrentHp),
  };
}

export function calculateHpHealing({ currentHp = 0, maxHp = 1, amount = 0 } = {}) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const safeMaxHp = Math.max(1, Number(maxHp) || 1);
  const safeCurrentHp = Math.max(0, Math.min(safeMaxHp, Number(currentHp) || 0));
  const nextCurrentHp = Math.min(safeMaxHp, safeCurrentHp + safeAmount);

  return {
    current_hit_points: nextCurrentHp,
    healed: nextCurrentHp - safeCurrentHp,
  };
}

export const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return [];
};

export const featureTypeLabel = (type) => {
  if (type === 'bonus_action') return 'Bonus action';
  if (type === 'reaction') return 'Reaction';
  if (type === 'action_modifier') return 'Attack modifier';
  if (type === 'action') return 'Action';
  if (type === 'special') return 'Special';
  return 'Passive';
};

export function parseHitDie(hitDice = '1d8') {
  const match = String(hitDice).match(/(\d+)d(\d+)/i);
  if (!match) return { total: 1, sides: 8 };
  return { total: Number(match[1]) || 1, sides: Number(match[2]) || 8 };
}

export function rollD20(modifier = 0, rollMode = 'normal') {
  const first = Math.floor(Math.random() * 20) + 1;
  if (rollMode !== 'advantage' && rollMode !== 'disadvantage') {
    return { d20: first, modifier, total: first + modifier, mode: 'normal', allRolls: [first] };
  }
  const second = Math.floor(Math.random() * 20) + 1;
  const kept = rollMode === 'advantage' ? Math.max(first, second) : Math.min(first, second);
  return { d20: kept, modifier, total: kept + modifier, mode: rollMode, allRolls: [first, second] };
}

export function rollHitDie(sides = 8, modifier = 0) {
  const die = Math.floor(Math.random() * sides) + 1;
  return { die, total: Math.max(1, die + modifier) };
}
