import React from 'react';
import { Eye, Footprints, Gauge, Shield } from 'lucide-react';

import { ABILITIES, SKILLS, fmt, mod } from './cleanSheetUtils';
import './CleanSheetOverviewCompact.css';

const SAVE_NAMES = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
};

export default function CleanSheetOverviewTab({
  character,
  ac,
  speed,
  proficiencyBonus,
  passiveScores = [],
  saveProficiencies,
  skillProficiencies,
  onRoll,
}) {
  const coreStats = [
    { label: 'AC', value: ac ?? character.armor_class ?? 10, icon: Shield },
    { label: 'Speed', value: `${speed ?? character.speed ?? 30}ft`, icon: Footprints },
    { label: 'Prof', value: fmt(proficiencyBonus), icon: Gauge },
  ];

  return (
    <div className="clean-sheet-grid clean-sheet-stats-tab clean-sheet-stats-tab--compact">
      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-core-stats-section">
        <h2>Core Stats</h2>
        <div className="clean-sheet-core-stat-grid">
          {coreStats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="clean-sheet-core-stat-card">
              <Icon size={15} />
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      {passiveScores.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-passives-section">
          <h2>Passives</h2>
          <div className="clean-sheet-passive-grid">
            {passiveScores.map(([skill, value]) => (
              <div key={skill} className="clean-sheet-passive-card">
                <Eye size={14} />
                <span>Passive {skill}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

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
        <div className="clean-sheet-compact-saves clean-sheet-readable-saves">
          {ABILITIES.map(([key, short]) => {
            const proficient = saveProficiencies.includes(key) || saveProficiencies.includes(short.toLowerCase());
            const saveMod = mod(character[key]) + (proficient ? proficiencyBonus : 0);
            return (
              <div key={key} className="clean-sheet-save-card clean-sheet-compact-save">
                <div className="clean-sheet-save-label">
                  <strong>{short}</strong>
                  <span>{SAVE_NAMES[short]}</span>
                </div>
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
        <div className="clean-sheet-compact-skills clean-sheet-readable-skills">
          {SKILLS.map(([skill, ability]) => {
            const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
            const skillMod = mod(character[ability]) + (proficient ? proficiencyBonus : 0);
            return (
              <div key={skill} className="clean-sheet-skill-card clean-sheet-compact-skill">
                <div className="clean-sheet-skill-name">
                  <span>{skill}</span>
                  <div className="clean-sheet-skill-tags">
                    <em>{ability.slice(0, 3).toUpperCase()}</em>
                    {proficient && <small>Prof</small>}
                  </div>
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
