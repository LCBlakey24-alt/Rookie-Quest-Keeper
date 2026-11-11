/**
 * Skill modifiers as the rules give them, shared by every place the sheet
 * shows a skill or a passive score.
 *
 *   modifier = ability modifier
 *            + proficiency bonus             if proficient
 *            + proficiency bonus again       with Expertise (Rogue, Bard, ...)
 *            + half proficiency, rounded down, for an unproficient skill
 *              with Jack of All Trades (Bard level 2+, both editions)
 *
 * Expertise is stored as `expertise` or `expertise_skills`; skill names are
 * matched without regard to case, as both forms appear in saved records.
 */
import { classLevelFor } from '@/data/levelUpProgressionRules';

const abilityModifier = (score) => Math.floor((Number(score || 10) - 10) / 2);
const lowerList = (value) => (Array.isArray(value) ? value : []).map((entry) => String(entry?.name ?? entry).trim().toLowerCase());

export function hasJackOfAllTrades(character) {
  return Boolean(character) && classLevelFor(character, 'Bard') >= 2;
}

/**
 * @returns {{ modifier: number, proficient: boolean, expertise: boolean, halfProficiency: boolean }}
 */
export function skillModifier(source, skill, ability, proficiencyBonus = 2) {
  // The sheet renders before the character has loaded.
  const character = source || {};
  const name = String(skill).toLowerCase();
  const proficient = lowerList(character.skill_proficiencies).includes(name);
  const expertise = proficient && [...lowerList(character.expertise), ...lowerList(character.expertise_skills)].includes(name);
  const halfProficiency = !proficient && hasJackOfAllTrades(character);
  const bonus = Number(proficiencyBonus) || 0;
  const extra = expertise ? bonus * 2 : proficient ? bonus : halfProficiency ? Math.floor(bonus / 2) : 0;
  return { modifier: abilityModifier(character[ability]) + extra, proficient, expertise, halfProficiency };
}

/** The highest skill, for the sheet's summary: { skill, modifier } or null. */
export function bestSkill(character, skills = [], proficiencyBonus = 2) {
  let best = null;
  skills.forEach(([skill, ability]) => {
    const { modifier } = skillModifier(character, skill, ability, proficiencyBonus);
    if (!best || modifier > best.modifier) best = { skill, modifier };
  });
  return best;
}

/** Passive score: 10 + the skill modifier. */
export function passiveScore(character, skill, ability, proficiencyBonus = 2) {
  return 10 + skillModifier(character, skill, ability, proficiencyBonus).modifier;
}
