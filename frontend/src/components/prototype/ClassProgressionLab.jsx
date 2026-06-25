import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Home, ListChecks, Shield, Sparkles } from 'lucide-react';

import { CLASS_NAMES_2014, clampLevel, getProgressionSnapshot } from '@/data/classProgressions2014';
import './ClassProgressionLab.css';

const LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);

function formatList(items = []) {
  return items?.length ? items.join(', ') : '—';
}

function formatResourceValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object' && 'slots' in value && 'level' in value) {
    const slotLabel = value.slots === 1 ? 'slot' : 'slots';
    return `${value.slots} ${slotLabel} @ Lv ${value.level}`;
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function getCastingLabel(snapshot) {
  if (!snapshot) return '—';
  if (snapshot.spellcasting === 'none') return 'Non-caster';
  if (snapshot.spellcasting === 'full') return 'Full caster';
  if (snapshot.spellcasting === 'half') return 'Half caster';
  if (snapshot.spellcasting === 'pact') return 'Pact Magic';
  if (snapshot.spellcasting === 'subclass-dependent') return 'Subclass dependent';
  return snapshot.spellcasting;
}

function SlotPills({ slots = {}, spellcasting }) {
  const entries = Object.entries(slots || {});
  if (!entries.length) return <span className="progression-empty">No spell slots</span>;
  return (
    <div className="progression-slot-pills">
      {entries.map(([slotLevel, count]) => (
        <span key={slotLevel}>{spellcasting === 'pact' ? 'Pact ' : ''}Lv {slotLevel}: {count}</span>
      ))}
    </div>
  );
}

function FeatureList({ title, features }) {
  return (
    <section className="progression-card">
      <h2>{title}</h2>
      {features?.length ? (
        <ul>{features.map(feature => <li key={feature}>{feature}</li>)}</ul>
      ) : <p className="progression-empty">No new listed features at this level.</p>}
    </section>
  );
}

function ClassComparisonTable({ snapshots, selectedClass }) {
  return (
    <section className="progression-card progression-card--wide">
      <h2>All classes at this level</h2>
      <div className="progression-table-wrap">
        <table className="progression-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Prof.</th>
              <th>Hit Die</th>
              <th>Subclass</th>
              <th>ASI now</th>
              <th>Casting</th>
              <th>Slots</th>
              <th>Resources</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map(row => (
              <tr key={row.className} className={row.className === selectedClass ? 'is-selected' : undefined}>
                <td>{row.className}</td>
                <td>+{row.proficiencyBonus}</td>
                <td>{row.hitDie}</td>
                <td>Lv {row.subclassLevel}</td>
                <td>{row.asiLevels.includes(row.level) ? 'Yes' : '—'}</td>
                <td>{getCastingLabel(row)}</td>
                <td><SlotPills slots={row.currentSpellSlots} spellcasting={row.spellcasting} /></td>
                <td>
                  {row.resources.length
                    ? row.resources.map(resource => `${resource.label}: ${formatResourceValue(resource.currentValue)}`).join(' / ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ClassProgressionLab() {
  const [className, setClassName] = useState('Warlock');
  const [level, setLevel] = useState(1);
  const snapshot = useMemo(() => getProgressionSnapshot(className, level), [className, level]);
  const comparisonSnapshots = useMemo(
    () => CLASS_NAMES_2014.map(name => getProgressionSnapshot(name, level)).filter(Boolean),
    [level]
  );

  if (!snapshot) return null;

  return (
    <main className="class-progression-lab">
      <header className="progression-hero">
        <span><ListChecks size={18} /> Frontend-only progression testing</span>
        <h1>Class Progressions</h1>
        <p>Check every 2014 class level-by-level before wiring level-up automation, rest recovery, resources, and spell slots into the live sheet.</p>
        <div className="progression-actions">
          <Link to="/prototype"><Home size={16} /> Prototype Hub</Link>
          <Link to="/prototype-mobile"><Shield size={16} /> Class Test Lab</Link>
        </div>
      </header>

      <section className="progression-controls">
        <label>
          <span>Class</span>
          <select value={className} onChange={event => setClassName(event.target.value)}>
            {CLASS_NAMES_2014.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>
          <span>Level</span>
          <input type="number" min="1" max="20" value={level} onChange={event => setLevel(clampLevel(event.target.value))} />
        </label>
      </section>

      <section className="progression-level-grid" aria-label="Level shortcuts">
        {LEVELS.map(levelOption => (
          <button
            key={levelOption}
            type="button"
            className={levelOption === snapshot.level ? 'is-active' : undefined}
            onClick={() => setLevel(levelOption)}
          >
            {levelOption}
          </button>
        ))}
      </section>

      <section className="progression-summary-grid">
        <article><span>Class</span><strong>{snapshot.className}</strong><em>{getCastingLabel(snapshot)}</em></article>
        <article><span>Level</span><strong>{snapshot.level}</strong><em>{snapshot.nextLevel ? `Next: ${snapshot.nextLevel}` : 'Max level'}</em></article>
        <article><span>Proficiency</span><strong>+{snapshot.proficiencyBonus}</strong><em>{snapshot.nextProficiencyBonus && snapshot.nextProficiencyBonus !== snapshot.proficiencyBonus ? `Next +${snapshot.nextProficiencyBonus}` : 'No change next'}</em></article>
        <article><span>Hit Die</span><strong>{snapshot.hitDie}</strong><em>Durability marker</em></article>
        <article><span>Primary</span><strong>{formatList(snapshot.primaryAbilities)}</strong><em>Build focus</em></article>
        <article><span>Saves</span><strong>{formatList(snapshot.savingThrows)}</strong><em>Starting proficiencies</em></article>
        <article><span>Subclass</span><strong>Lv {snapshot.subclassLevel}</strong><em>{snapshot.level >= snapshot.subclassLevel ? 'Chosen by this level' : 'Still to choose'}</em></article>
        <article><span>ASI Levels</span><strong>{snapshot.asiLevels.join(', ')}</strong><em>{snapshot.asiLevels.includes(snapshot.level) ? 'ASI now' : '—'}</em></article>
      </section>

      <section className="progression-columns">
        <FeatureList title={`Level ${snapshot.level} unlocks`} features={snapshot.currentFeatures} />
        <FeatureList title={snapshot.nextLevel ? `Level ${snapshot.nextLevel} next` : 'Next level'} features={snapshot.nextFeatures} />
      </section>

      <section className="progression-card progression-card--wide">
        <h2>Spell slots</h2>
        <div className="progression-slot-meta">
          <span>{getCastingLabel(snapshot)}</span>
          <em>{snapshot.spellAbility ? `${snapshot.spellAbility} spellcasting` : 'No core spellcasting ability tracked'}</em>
        </div>
        <div className="progression-slot-compare">
          <div><span>Current</span><SlotPills slots={snapshot.currentSpellSlots} spellcasting={snapshot.spellcasting} /></div>
          <ArrowRight size={18} />
          <div><span>Next</span><SlotPills slots={snapshot.nextSpellSlots} spellcasting={snapshot.spellcasting} /></div>
        </div>
      </section>

      <section className="progression-card progression-card--wide">
        <h2>Resources</h2>
        {snapshot.resources.length ? (
          <div className="progression-resource-list">
            {snapshot.resources.map(resource => (
              <div key={resource.key}>
                <Sparkles size={16} />
                <span>{resource.label}</span>
                <strong>{formatResourceValue(resource.currentValue)}</strong>
                <em>{resource.restore}</em>
                {resource.nextValue !== resource.currentValue && <small>Next: {formatResourceValue(resource.nextValue)}</small>}
              </div>
            ))}
          </div>
        ) : <p className="progression-empty">No core class resource tracked for this class yet.</p>}
      </section>

      <ClassComparisonTable snapshots={comparisonSnapshots} selectedClass={snapshot.className} />

      <section className="progression-card progression-card--wide">
        <h2>Progression audit checklist</h2>
        <ul>
          <li>Compare class resource values against the Mobile Class Lab test character.</li>
          <li>Check spell slots before wiring automatic short-rest or long-rest recovery.</li>
          <li>Flag subclass-dependent cases before assuming a base class always has spells or resources.</li>
          <li>Use this page as the source check before adding level-up automation to real characters.</li>
        </ul>
      </section>
    </main>
  );
}
