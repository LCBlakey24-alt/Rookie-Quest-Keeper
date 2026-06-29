import React from 'react';

import { ABILITIES, SKILLS, fmt, mod } from './cleanSheetUtils';
import './CleanSheetOverviewCompact.css';

export default function CleanSheetOverviewTab({
  character,
  proficiencyBonus,
  saveProficiencies,
  skillProficiencies,
  onRoll,
}) {
  return (
    <div className="clean-sheet-grid clean-sheet-stats-tab clean-sheet-stats-tab--compact">
      <section className="clean-sheet-panel clean-sheet-compact-section">
        <h2>Ability Scores</h2>
        <div className="clean-sheet-compact-abilities">
          {ABILITIES.map(([key, short]) => {
            const abilityMod = mod(character[key]);
            return (
              <div key={key} className="clean-sheet-ability clean-sheet-compact-ability">
                <span>{short}</span>
                <strong>{character[key] ?? 10}</strong>
                <button type="button" className="clean-sheet-roll-chip" onClick={() => onRoll(`${short} Check`, abilityMod)} aria-label={`Roll ${short} check ${fmt(abilityMod)}`}>
                  {fmt(abilityMod)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-compact-section">
        <h2>Saving Throws</h2>
        <div className="clean-sheet-compact-saves">
          {ABILITIES.map(([key, short]) => {
            const proficient = saveProficiencies.includes(key) || saveProficiencies.includes(short.toLowerCase());
            const saveMod = mod(character[key]) + (proficient ? proficiencyBonus : 0);
            return (
              <div key={key} className="clean-sheet-save-card clean-sheet-compact-save">
                <span>{short}</span>
                {proficient && <em>Prof</em>}
                <button type="button" className="clean-sheet-roll-chip" onClick={() => onRoll(`${short} Save`, saveMod)} aria-label={`Roll ${short} save ${fmt(saveMod)}`}>
                  {fmt(saveMod)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section">
        <h2>Skills</h2>
        <div className="clean-sheet-compact-skills">
          {SKILLS.map(([skill, ability]) => {
            const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
            const skillMod = mod(character[ability]) + (proficient ? proficiencyBonus : 0);
            return (
              <div key={skill} className="clean-sheet-skill-card clean-sheet-compact-skill">
                <div className="clean-sheet-skill-name">
                  <span>{skill}</span>
                  <em>{ability.slice(0, 3).toUpperCase()}</em>
                  {proficient && <small>Prof</small>}
                </div>
                <button type="button" className="clean-sheet-roll-chip" onClick={() => onRoll(skill, skillMod)} aria-label={`Roll ${skill} ${fmt(skillMod)}`}>
                  {fmt(skillMod)}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
