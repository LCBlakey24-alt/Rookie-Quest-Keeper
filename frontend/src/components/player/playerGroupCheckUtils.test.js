import {
  abilityKeyForCheck,
  findGroupCheckResult,
  findTargetedCharacter,
  modifierForGroupCheck,
} from './playerGroupCheckUtils';

const hero = {
  id: 'char-1',
  name: 'Hero',
  level: 5,
  wisdom: 16,
  dexterity: 14,
  proficiency_bonus: 3,
  skill_proficiencies: ['Perception', 'Stealth'],
  expertise_choices: ['Perception'],
};

test('targets only a character included in the GM request', () => {
  expect(findTargetedCharacter([hero], { party: [{ id: 'char-1', name: 'Hero' }] })).toBe(hero);
  expect(findTargetedCharacter([hero], { party: [{ id: 'someone-else', name: 'Other Hero' }] })).toBeNull();
});

test('matches an existing submitted result to the targeted character', () => {
  const result = { character_id: 'char-1', character_name: 'Hero', total: 18 };
  expect(findGroupCheckResult(hero, { results: [result] })).toBe(result);
  expect(findGroupCheckResult(hero, { results: [{ character_id: 'char-2', total: 9 }] })).toBeNull();
});

test('uses skill ability, proficiency and expertise for a requested check', () => {
  expect(abilityKeyForCheck({ check_name: 'Perception', ability: 'Wisdom' })).toBe('wisdom');
  expect(modifierForGroupCheck(hero, { check_name: 'Perception', ability: 'Wisdom' })).toEqual({
    ability: 'wisdom',
    modifier: 9,
    proficient: true,
    expertise: true,
  });
});

test('uses one proficiency bonus for a proficient non-expertise skill', () => {
  expect(modifierForGroupCheck(hero, { check_name: 'Stealth', ability: 'Dexterity' })).toEqual({
    ability: 'dexterity',
    modifier: 5,
    proficient: true,
    expertise: false,
  });
});

test('falls back to the raw ability modifier for an untrained ability check', () => {
  expect(modifierForGroupCheck(hero, { check_name: 'Strength', ability: 'Strength' })).toEqual({
    ability: 'strength',
    modifier: 0,
    proficient: false,
    expertise: false,
  });
});
