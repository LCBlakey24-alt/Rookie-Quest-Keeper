import React from 'react';

import { ABILITIES, SKILLS, fmt, mod } from './cleanSheetUtils';

export default function CleanSheetOverviewTab({
  ac,
  actionEconomyGroups,
  character,
  classFeatureSummary,
  exhaustionLevel,
  proficiencyBonus,
  proficiencySummary,
  rulesEdition,
  saveProficiencies,
  skillProficiencies,
  speed,
  onOpenInventory,
  onRoll,
}) {
  return (
    <div className="clean-sheet-grid">
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

      <section className="clean-sheet-panel clean-sheet-wide" data-testid="class-feature-action-economy">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Class Features & Turn Options</h2>
            <p>{rulesEdition} rules • {character.character_class || 'Class'} level {character.level || 1}</p>
          </div>
          <span>{classFeatureSummary.length} features</span>
        </div>
        <div className="clean-sheet-feature-lanes">
          {Object.entries(actionEconomyGroups).map(([label, features]) => (
            <div key={label} className="clean-sheet-feature-lane">
              <h3>{label}</h3>
              {features.slice(0, 5).length ? features.slice(0, 5).map((feature) => (
                <article key={`${label}-${feature.name}-${feature.level || 'sheet'}`} className="clean-sheet-feature-card">
                  <div>
                    <strong>{feature.name}</strong>
                    {feature.level && <span>Level {feature.level}</span>}
                  </div>
                  {feature.uses && <em>{feature.uses}</em>}
                  {feature.description && <p>{feature.description}</p>}
                </article>
              )) : (
                <p className="clean-sheet-feature-empty">No {label.toLowerCase()} features found yet.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide" data-testid="proficiency-equipment-summary">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Proficiencies & Equipment Readiness</h2>
            <p>Quick checks for armour, weapons, tools, languages, AC, speed, and multiclass readiness.</p>
          </div>
          <button type="button" onClick={onOpenInventory}>Open inventory</button>
        </div>
        <div className="clean-sheet-readiness-grid">
          <div><span>Armour Class</span><strong>{ac}</strong><em>Derived from equipped armour, shield, and stats.</em></div>
          <div><span>Speed</span><strong>{speed}ft</strong><em>Check class, race/species, armour, and conditions.</em></div>
          <div><span>Exhaustion</span><strong>{exhaustionLevel}</strong><em>{exhaustionLevel ? 'Apply condition penalties at the table.' : 'No exhaustion marked.'}</em></div>
          <div><span>Proficiency</span><strong>{fmt(proficiencyBonus)}</strong><em>Total character level based.</em></div>
        </div>
        <div className="clean-sheet-proficiency-lists">
          {proficiencySummary.map(([label, items]) => (
            <div key={label}>
              <h3>{label}</h3>
              <p>{items.length ? items.slice(0, 10).join(', ') : 'None recorded yet'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
