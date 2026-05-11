import React from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import '@/styles/skillsStep.css';

const ALL_SKILLS = {
  Acrobatics: 'dexterity',
  'Animal Handling': 'wisdom',
  Arcana: 'intelligence',
  Athletics: 'strength',
  Deception: 'charisma',
  History: 'intelligence',
  Insight: 'wisdom',
  Intimidation: 'charisma',
  Investigation: 'intelligence',
  Medicine: 'wisdom',
  Nature: 'intelligence',
  Perception: 'wisdom',
  Performance: 'charisma',
  Persuasion: 'charisma',
  Religion: 'intelligence',
  'Sleight of Hand': 'dexterity',
  Stealth: 'dexterity',
  Survival: 'wisdom',
};

function abilityShort(ability = '') {
  return String(ability).slice(0, 3).toUpperCase();
}

function getClassSkillOptions(classData) {
  if (!classData) return [];
  if (classData.skillChoices === 'any') return Object.keys(ALL_SKILLS);
  return classData.skillChoices || [];
}

function SkillButton({ skill, ability, selected, granted, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`skills-step-card ${selected ? 'selected' : ''} ${granted ? 'granted' : ''}`}
      onClick={onClick}
      disabled={disabled || granted}
    >
      <span>{abilityShort(ability)}</span>
      <strong>{skill}</strong>
      {granted && <em><CheckCircle2 size={13} /> Granted</em>}
      {selected && !granted && <em><CheckCircle2 size={13} /> Selected</em>}
    </button>
  );
}

export default function SkillsStep({
  classData,
  backgroundData,
  selectedSkills = [],
  setSelectedSkills,
  versatilitySkills = [],
  setVersatilitySkills,
  hasHalfElfVersatility = false,
}) {
  const classSkillOptions = getClassSkillOptions(classData);
  const classSkillCount = Number(classData?.skillCount || 0);
  const backgroundSkills = backgroundData?.skillProficiencies || [];
  const backgroundSkillSet = new Set(backgroundSkills);
  const selectedClassSkills = selectedSkills.filter(skill => !backgroundSkillSet.has(skill));
  const versatilityNeeded = hasHalfElfVersatility ? 2 : 0;

  const toggleClassSkill = (skill) => {
    if (backgroundSkillSet.has(skill)) return;
    setSelectedSkills?.(prev => {
      const cleanPrev = (prev || []).filter(item => !backgroundSkillSet.has(item));
      if (cleanPrev.includes(skill)) return cleanPrev.filter(item => item !== skill);
      if (cleanPrev.length >= classSkillCount) return cleanPrev;
      return [...cleanPrev, skill];
    });
  };

  const toggleVersatilitySkill = (skill) => {
    if (!hasHalfElfVersatility) return;
    setVersatilitySkills?.(prev => {
      const current = prev || [];
      if (current.includes(skill)) return current.filter(item => item !== skill);
      if (current.length >= versatilityNeeded) return current;
      return [...current, skill];
    });
  };

  return (
    <div className="skills-step">
      <div className="skills-step-header">
        <div><Award size={22} /><strong>Choose Skills</strong></div>
        <p>Background skills are granted automatically. Only class skill choices count against your class total.</p>
      </div>

      <section className="skills-step-panel">
        <div className="skills-step-counter-row">
          <span>Class skill choices</span>
          <strong>{selectedClassSkills.length} / {classSkillCount}</strong>
        </div>
        {backgroundSkills.length > 0 && (
          <div className="skills-step-granted-row">
            <span>Granted by background:</span>
            <div>{backgroundSkills.map(skill => <em key={skill}>{skill}</em>)}</div>
          </div>
        )}
        <div className="skills-step-grid">
          {classSkillOptions.map(skill => (
            <SkillButton
              key={skill}
              skill={skill}
              ability={ALL_SKILLS[skill]}
              selected={selectedClassSkills.includes(skill)}
              granted={backgroundSkillSet.has(skill)}
              disabled={selectedClassSkills.length >= classSkillCount && !selectedClassSkills.includes(skill)}
              onClick={() => toggleClassSkill(skill)}
            />
          ))}
        </div>
      </section>

      {hasHalfElfVersatility && (
        <section className="skills-step-panel">
          <div className="skills-step-counter-row">
            <span>Half-Elf Skill Versatility</span>
            <strong>{versatilitySkills.length} / {versatilityNeeded}</strong>
          </div>
          <div className="skills-step-grid">
            {Object.keys(ALL_SKILLS).map(skill => (
              <SkillButton
                key={`versatility-${skill}`}
                skill={skill}
                ability={ALL_SKILLS[skill]}
                selected={versatilitySkills.includes(skill)}
                granted={backgroundSkillSet.has(skill) || selectedClassSkills.includes(skill)}
                disabled={versatilitySkills.length >= versatilityNeeded && !versatilitySkills.includes(skill)}
                onClick={() => toggleVersatilitySkill(skill)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export { ALL_SKILLS, getClassSkillOptions };
