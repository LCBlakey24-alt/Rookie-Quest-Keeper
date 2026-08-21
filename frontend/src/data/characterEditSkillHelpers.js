const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

/**
 * Saved characters store their complete proficiency list, while the creator's
 * selectedSkills field represents only the player's class-skill choices.
 * Remove skills granted automatically by the loaded background before putting
 * a saved character back into the creator.
 */
export function classSkillsForEdit(skillProficiencies, backgroundSkills) {
  const granted = new Set(list(backgroundSkills));
  return Array.from(new Set(list(skillProficiencies))).filter((skill) => !granted.has(skill));
}

export default classSkillsForEdit;
