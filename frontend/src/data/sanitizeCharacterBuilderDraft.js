// Character builder draft recovery.
// Prevents stale/background-granted skills from being counted as manually
// selected class skills after changing class/background or after older drafts.
import { BACKGROUNDS, CLASSES } from './characterRules5e';
import './applyTestBackgrounds';

const DRAFT_KEY = 'rq_character_builder_draft_v2';

const ALL_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'
];

function getClassSkillOptions(className) {
  const classData = CLASSES[className];
  if (!classData) return [];
  if (classData.skillChoices === 'any') return ALL_SKILLS;
  return classData.skillChoices || [];
}

try {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (raw) {
    const draft = JSON.parse(raw);
    const className = draft?.className || '';
    const backgroundName = draft?.background || '';
    const classData = CLASSES[className];
    const backgroundData = BACKGROUNDS[backgroundName];
    const classOptions = new Set(getClassSkillOptions(className));
    const backgroundSkills = new Set(backgroundData?.skillProficiencies || []);
    const classSkillLimit = Number(classData?.skillCount || 0);

    if (Array.isArray(draft.selectedSkills)) {
      const cleaned = draft.selectedSkills
        .filter(skill => classOptions.has(skill))
        .filter(skill => !backgroundSkills.has(skill))
        .slice(0, classSkillLimit);

      if (
        cleaned.length !== draft.selectedSkills.length ||
        cleaned.some((skill, index) => skill !== draft.selectedSkills[index])
      ) {
        draft.selectedSkills = cleaned;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    }
  }
} catch {
  localStorage.removeItem(DRAFT_KEY);
}
