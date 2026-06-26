import React from 'react';

import { ABILITIES, SKILLS, fmt, mod } from './cleanSheetUtils';

export default function CleanSheetOverviewTab({
  character,
  proficiencyBonus,
  saveProficiencies,
  skillProficiencies,
  onRoll,
}) {
  return (
    <div className="clean-sheet-grid clean-sheet-stats-tab">
      <section className="clean-sheet-panel">
        <h2>Ability Scores</h2>
        <div className="clean-sheet-abilities">
          {ABILITIES.map(([key, short]) => {
            const abilityMod = mod(character[key]);
            return (
              <button key={key} type="button" className="clean-sheet-ability clean-sheet-clickable" onClick={() => onRoll(`${short} Check`, abilityMod)}>
                <span>{short}</span>
                <strong>{character[key] ?? 10}</strong>
                <em>{fmt(abilityMod)}</em>
              </button>
            );
          })}
        </div>
      </section>

      <section className="clean-sheet-panel">
        <h2>Saving Throws</h2>
        <div className="clean-sheet-save-grid">
          {ABILITIES.map(([key, short]) => {
            const proficient = saveProficiencies.includes(key) || saveProficiencies.includes(short.toLowerCase());
            const saveMod = mod(character[key]) + (proficient ? proficiencyBonus : 0);
            return (
              <button key={key} type="button" className="clean-sheet-save-card" onClick={() => onRoll(`${short} Save`, saveMod)}>
                <span>{short}</span>
                <strong>{fmt(saveMod)}</strong>
                {proficient && <em>Proficient</em>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide">
        <h2>Skills</h2>
        <div className="clean-sheet-skill-grid">
          {SKILLS.map(([skill, ability]) => {
            const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
            const skillMod = mod(character[ability]) + (proficient ? proficiencyBonus : 0);
            return (
              <button key={skill} type="button" className="clean-sheet-skill-card" onClick={() => onRoll(skill, skillMod)}>
                <span>{skill}</span>
                <em>{ability.slice(0, 3).toUpperCase()}</em>
                <strong>{fmt(skillMod)}</strong>
                {proficient && <small>Proficient</small>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
