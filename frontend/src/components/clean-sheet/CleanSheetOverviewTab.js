import React, { useMemo, useState } from 'react';
import { Eye, Footprints, Gauge, Shield, Swords } from 'lucide-react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { ABILITIES, SKILLS, fmt, mod } from './cleanSheetUtils';
import './CleanSheetOverviewCompact.css';
import './CleanSheetOverviewSpacing.css';

const SAVE_NAMES = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
};

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

function SkillLabel({ skill }) {
  return (
    <span className="clean-sheet-skill-label">
      <span className="clean-sheet-skill-label-word">{skill}</span>
    </span>
  );
}

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
  const [skillFilter, setSkillFilter] = useState('all');
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const snapshotSpeed = snapshot.race?.speed || speed || character.speed || 30;
  const snapshotProficiency = snapshot.proficiencyBonus || proficiencyBonus;
  const initiativeMod = mod(character.dexterity);
  const coreStats = [
    { label: 'AC', value: ac ?? character.armor_class ?? 10, icon: Shield },
    { label: 'Speed', value: `${snapshotSpeed}ft`, icon: Footprints },
    { label: 'Prof', value: fmt(snapshotProficiency), icon: Gauge },
    { label: 'Init', value: fmt(initiativeMod), icon: Swords, roll: true },
  ];

  const skillRows = useMemo(() => {
    return SKILLS.map(([skill, ability]) => {
      const proficient = skillProficiencies.includes(skill) || skillProficiencies.includes(skill.toLowerCase());
      const skillMod = mod(character[ability]) + (proficient ? snapshotProficiency : 0);
      return { skill, ability, proficient, skillMod };
    });
  }, [character, snapshotProficiency, skillProficiencies]);

  const proficientSkills = skillRows.filter(row => row.proficient);
  const bestSkill = skillRows.reduce((best, row) => (row.skillMod > best.skillMod ? row : best), skillRows[0] || { skill: 'None', skillMod: 0 });
  const visibleSkills = skillRows.filter(row => {
    if (skillFilter === 'all') return true;
    if (skillFilter === 'prof') return row.proficient;
    return row.ability === skillFilter;
  });

  return (
    <div className="clean-sheet-grid clean-sheet-stats-tab clean-sheet-stats-tab--compact">
      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-core-stats-section">
        <h2>Core Stats</h2>
        <div className="clean-sheet-core-stat-grid">
          {coreStats.map(({ label, value, icon: Icon, roll }) => {
            const inner = (
              <>
                <Icon size={15} />
                <span>{label}</span>
                <strong>{value}</strong>
              </>
            );
            return roll ? (
              <button key={label} type="button" className="clean-sheet-core-stat-card clean-sheet-core-stat-card--rollable" onClick={() => onRoll('Initiative', initiativeMod)} aria-label={`Roll initiative ${fmt(initiativeMod)}`}>
                {inner}
              </button>
            ) : (
              <div key={label} className="clean-sheet-core-stat-card">
                {inner}
              </div>
            );
          })}
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
            const saveMod = mod(character[key]) + (proficient ? snapshotProficiency : 0);
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

      <section className="clean-sheet-panel clean-sheet-wide clean-sheet-compact-section clean-sheet-skills-section">
        <div className="clean-sheet-section-heading-row">
          <h2>Skills</h2>
          <span>{visibleSkills.length}/{skillRows.length} shown</span>
        </div>

        <div className="clean-sheet-skills-summary">
          <div><span>Proficient</span><strong>{proficientSkills.length}</strong></div>
          <div><span>Best Skill</span><strong>{bestSkill.skill} {fmt(bestSkill.skillMod)}</strong></div>
          <div><span>Filter</span><strong>{SKILL_FILTERS.find(([id]) => id === skillFilter)?.[1] || 'All'}</strong></div>
        </div>

        <div className="clean-sheet-skill-filter-row" aria-label="Filter skills">
          {SKILL_FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={skillFilter === id ? 'active' : ''} onClick={() => setSkillFilter(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="clean-sheet-compact-skills clean-sheet-readable-skills">
          {visibleSkills.map(({ skill, ability, proficient, skillMod }) => (
            <div key={skill} className={`clean-sheet-skill-card clean-sheet-compact-skill ${proficient ? 'is-proficient' : ''}`}>
              <div className="clean-sheet-skill-name">
                <SkillLabel skill={skill} />
                <div className="clean-sheet-skill-tags">
                  <em title={ABILITY_FULL_NAMES[ability]}>{ability.slice(0, 3).toUpperCase()}</em>
                  {proficient && <small>Prof</small>}
                </div>
              </div>
              <button type="button" className="clean-sheet-roll-chip" onClick={() => onRoll(skill, skillMod)} aria-label={`Roll ${skill} ${fmt(skillMod)}`}>
                {fmt(skillMod)}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
