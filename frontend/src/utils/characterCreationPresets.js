import { BACKGROUNDS, CLASSES, RACES } from '../data/characterRules5e';

export const CLASS_ABILITY_FOCUS = {
  Fighter: 'strength',
  Barbarian: 'strength',
  Paladin: 'strength',
  Rogue: 'dexterity',
  Ranger: 'dexterity',
  Wizard: 'intelligence',
  Sorcerer: 'charisma',
  Warlock: 'charisma',
  Bard: 'charisma',
  Cleric: 'wisdom',
  Druid: 'wisdom',
  Monk: 'dexterity',
};

export const ABILITY_OPTIONS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

export function safeCharacterClass(characterClass, fallback = 'Fighter') {
  return CLASSES[characterClass] ? characterClass : fallback;
}

export function safeRace(race, fallback = 'Human') {
  return RACES[race] ? race : fallback;
}

export function safeBackground(background, fallback = 'Soldier') {
  return BACKGROUNDS[background] ? background : fallback;
}

export function abilityFocusForClass(characterClass, fallback = 'strength') {
  return CLASS_ABILITY_FOCUS[characterClass] || fallback;
}

export function buildBasicCreatorPreset(input = {}) {
  const safeClass = safeCharacterClass(input.characterClass);

  return {
    source: 'basic-creator',
    name: input.name || '',
    characterClass: safeClass,
    race: safeRace(input.race),
    background: safeBackground(input.background),
    abilityFocus: input.abilityFocus || abilityFocusForClass(safeClass),
    equipmentMode: input.equipmentMode || 'recommended',
    notes: `Basic Creator preset. Magic preference: ${input.magicPreference || 'not sure'}`,
  };
}

export function buildRookCreatorPreset(match = {}, description = '') {
  const suggestedClass = safeCharacterClass(match.suggestedClass);

  return {
    source: 'rook-matchmaker',
    name: '',
    characterClass: suggestedClass,
    race: safeRace(match.race),
    background: safeBackground(match.background),
    abilityFocus: abilityFocusForClass(suggestedClass),
    notes: `Matched from: ${description || match.title || 'Rook Character Matchmaker'}`,
  };
}
