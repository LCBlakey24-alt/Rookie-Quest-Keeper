import { Activity, Backpack, BookOpen, Bot, Edit3, ListChecks, Swords, UserCircle } from 'lucide-react';

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
  { id: 'character', label: 'Character', icon: UserCircle },
  { id: 'stats', label: 'Stats', icon: Activity },
  { id: 'combat', label: 'Actions', icon: Swords },
  { id: 'inventory', label: 'Inventory', icon: Backpack },
  { id: 'spells', label: 'Spells', icon: BookOpen },
  { id: 'features', label: 'Features', icon: ListChecks },
  { id: 'rook', label: 'Rook Helper', icon: Bot },
  { id: 'notes', label: 'Notes', icon: Edit3 },
];

export const mod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
export const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);
export const getMaxHp = (character) => Number(character?.max_hit_points ?? character?.max_hp ?? 10) || 10;
export const getCurrentHp = (character) => Number(character?.current_hit_points ?? character?.hp ?? getMaxHp(character)) || getMaxHp(character);
export const getTempHp = (character) => Number(character?.temporary_hit_points ?? character?.temp_hp ?? 0) || 0;
export const clampDeathCount = (value) => Math.max(0, Math.min(3, Number(value) || 0));
