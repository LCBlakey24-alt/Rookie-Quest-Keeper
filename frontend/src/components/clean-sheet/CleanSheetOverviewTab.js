import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { ABILITIES, SKILLS, fmt, mod } from './cleanSheetUtils';
import './CleanSheetOverviewCompact.css';
import './CleanSheetOverviewSpacing.css';
import './CleanSheetStatsMobileOverrides.css';
import './CleanSheetFinalHammer.css';
import './CleanSheetDicePolish.css';

const SKILL_FILTERS = [
  ['all', 'All'],
  ['prof', 'Prof'],
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['intelligence', 'INT'],
  ['wisdom', 'WIS'],
  ['charisma', 'CHA'],
];

const ABILITY_FULL_NAMES = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

function skillMatchesFilter(ability, activeFilter, proficient) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'prof') return proficient;
  return ability === activeFilter;
}

export default function CleanSheetOverviewTab({
  character,
  proficiencyBonus,
  passiveScores,
  saveProficiencies,
  skillProficiencies,
  onRoll,
}) {
  const [skillFilter, setSkillFilter] = useState('all');
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);

  return (
    <div className="clean-sheet-grid clean-sheet-stats-tab clean-sheet-stats-tab--compact">
      <section className="clean-sheet-panel clean-sheet-compact-section clean-sheet-ability-scores-panel">
        <h2>Ability Scores</h2>
        <div className="clean-sheet-compact-abilities clean-sheet-ability-score-strip">
          {ABILITIES.map(([key, label]) => {
            const score = Number(character?.[key] || 10);
            const modifier = mod(score);
            return (
              <div className="clean-sheet-compact-ability" key={key}>
                <span>{label}</span>
                <strong>{score}</strong>
                <button type="button" className="clean-sheet-roll-chip" onClick={() => onRoll(`${ABILITY_FULL_NAMES[key]} Check`, modifier)}>{fmt(modifier)}</button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-compact-section clean-sheet-saving-throws-panel">
        <h2>Saving Throws</h2>
        <div className="clean-sheet-readable-saves clean-sheet-saving-throw-strip">
          {ABILITIES.map(([key, label]) => {
            const proficient = saveProficiencies.includes(label) || saveProficiencies.includes(key);
            const modifier = mod(character?.[key]) + (proficient ? proficiencyBonus : 0);
            return (
              <div className={`clean-sheet-compact-save ${proficient ? 'is-proficient' : ''}`} key={key}>
                <div className="clean-sheet-save-label"><strong>{label}</strong></div>
                <div className="clean-sheet-save-roll-row">
                  {proficient && <span className="clean-sheet-save-prof-marker" aria-label="Proficient saving throw" title="Proficient" />}
                  <button type="button" className="clean-sheet-roll-chip" onClick={() => onRoll(`${label} Save`, modifier)}>{fmt(modifier)}</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-skills-panel">
        <div className="clean-sheet-section-heading-row">
          <h2>Skills</h2>
          <span>{SKILLS.filter(([skill, ability]) => skillMatchesFilter(ability, skillFilter, skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase()))).length}/{SKILLS.length} shown</span>
        </div>
        <div className="clean-sheet-skills-summary">
          <div><span>Proficient</span><strong>{skillProficiencies.length}</strong></div>
          <div><span>Best Skill</span><strong>{snapshot.skills?.topSkill || '—'}</strong></div>
          <div><span>Filter</span><strong>{SKILL_FILTERS.find(([id]) => id === skillFilter)?.[1] || 'All'}</strong></div>
        </div>
        <div className="clean-sheet-skill-filter-row" role="group" aria-label="Filter skills">
          {SKILL_FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={skillFilter === id ? 'active' : ''} onClick={() => setSkillFilter(id)}>{label}</button>
          ))}
        </div>
        <div className="clean-sheet-readable-skills">
          {SKILLS
            .filter(([skill, ability]) => skillMatchesFilter(ability, skillFilter, skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase())))
            .map(([skill, ability]) => {
              const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
              const modifier = mod(character?.[ability]) + (proficient ? proficiencyBonus : 0);
              return (
                <div className={`clean-sheet-compact-skill ${proficient ? 'is-proficient' : ''}`} key={skill}>
                  <div className="clean-sheet-skill-name">
                    <span className="clean-sheet-skill-label" title={skill}>{skill}</span>
                    <div className="clean-sheet-skill-tags">
                      {proficient && <small>Prof</small>}
                      <em>{ability.slice(0, 3).toUpperCase()}</em>
                    </div>
                  </div>
                  <button type="button" className="clean-sheet-roll-chip" onClick={() => onRoll(skill, modifier)}>{fmt(modifier)}</button>
                </div>
              );
            })}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-compact-section clean-sheet-passives">
        <h2>Passive Scores</h2>
        <div className="clean-sheet-passive-grid">
          {passiveScores.map(([name, value]) => (
            <div className="clean-sheet-passive-card" key={name}>
              <Eye size={15} />
              <span className="clean-sheet-passive-label"><small>Passive</small><em>{name}</em></span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
