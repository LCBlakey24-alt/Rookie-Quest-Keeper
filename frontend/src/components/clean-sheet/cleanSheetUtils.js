import { Activity, Backpack, BookOpen, Bot, Edit3, ListChecks, Sparkles, Swords, UserCircle, UsersRound } from 'lucide-react';

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
  { id: 'combat', label: 'Actions', icon: Swords },
  { id: 'inventory', label: 'Inventory', icon: Backpack },
  { id: 'spells', label: 'Spells', icon: BookOpen },
  { id: 'class', label: 'Class', icon: ListChecks },
  { id: 'species', label: 'Species', icon: UsersRound },
  { id: 'feats', label: 'Feats', icon: Sparkles },
  { id: 'character', label: 'Character', icon: UserCircle },
  { id: 'rook', label: 'Rook Helper', icon: Bot },
  { id: 'notes', label: 'Notes', icon: Edit3 },
];

export const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
export const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);
export const getMaxHp = (character) => Number(character?.max_hit_points ?? character?.max_hp ?? 10) || 10;
export const getCurrentHp = (character) => Number(character?.current_hit_points ?? character?.hp ?? getMaxHp(character)) || getMaxHp(character);
export const getTempHp = (character) => Number(character?.temporary_hit_points ?? character?.temp_hp ?? 0) || 0;
export const clampDeathCount = (value) => Math.max(0, Math.min(3, Number(value) || 0));

export const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return [];
};

const choiceName = (value) => {
  if (value && typeof value === 'object') return value.name || value.skill || value.label || value.title || '';
  return String(value || '');
};

export const normaliseSkillKey = (value) => choiceName(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export function getExpertiseSkills(character = {}) {
  const values = [
    ...toArray(character?.expertise),
    ...toArray(character?.expertise_choices),
    ...toArray(character?.expertise_skills),
  ];
  const seen = new Set();
  return values.filter((value) => {
    const key = normaliseSkillKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(choiceName);
}

export function getSkillProficiencyMultiplier(character = {}, skill = '', skillProficiencies = character?.skill_proficiencies) {
  const key = normaliseSkillKey(skill);
  if (!key) return 0;
  const expertise = getExpertiseSkills(character).some((entry) => normaliseSkillKey(entry) === key);
  if (expertise) return 2;
  const proficient = toArray(skillProficiencies).some((entry) => normaliseSkillKey(entry) === key);
  return proficient ? 1 : 0;
}

export function calculateSkillModifier({ character = {}, skill = '', ability = '', proficiencyBonus = 0, skillProficiencies } = {}) {
  const multiplier = getSkillProficiencyMultiplier(character, skill, skillProficiencies);
  return mod(character?.[ability]) + (Number(proficiencyBonus) || 0) * multiplier;
}

export function calculatePassiveSkill(args = {}) {
  return 10 + calculateSkillModifier(args);
}

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
  const options = rollMode && typeof rollMode === 'object' ? rollMode : { mode: rollMode };
  const mode = options.mode || 'normal';
  const totalModifier = (Number(modifier) || 0) + (Number(options.bonus) || 0);
  const first = Math.floor(Math.random() * 20) + 1;

  if (mode !== 'advantage' && mode !== 'disadvantage') {
    const rolls = [{ sides: 20, result: first }];
    return { d20: first, modifier: totalModifier, total: first + totalModifier, mode: 'normal', allRolls: [first], rolls, visibleRolls: rolls };
  }

  const second = Math.floor(Math.random() * 20) + 1;
  const keepFirst = mode === 'advantage' ? first >= second : first <= second;
  const kept = keepFirst ? first : second;
  const rolls = [
    { sides: 20, result: first, dropped: !keepFirst },
    { sides: 20, result: second, dropped: keepFirst },
  ];
  return { d20: kept, modifier: totalModifier, total: kept + totalModifier, mode, allRolls: [first, second], rolls, visibleRolls: rolls.filter(roll => !roll.dropped) };
}

export function rollHitDie(sides = 8, modifier = 0) {
  const die = Math.floor(Math.random() * sides) + 1;
  return { die, total: Math.max(1, die + modifier) };
}
