import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Home, ListChecks, Shield, Sparkles } from 'lucide-react';

import { CLASS_NAMES_2014, getProgressionSnapshot } from '@/data/classProgressions2014';
import './ClassProgressionLab.css';

function SlotPills({ slots = {} }) {
  const entries = Object.entries(slots || {});
  if (!entries.length) return <span className="progression-empty">No spell slots</span>;
  return (
    <div className="progression-slot-pills">
      {entries.map(([slotLevel, count]) => <span key={slotLevel}>Lv {slotLevel}: {count}</span>)}
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

export default function ClassProgressionLab() {
  const [className, setClassName] = useState('Warlock');
  const [level, setLevel] = useState(1);
  const snapshot = useMemo(() => getProgressionSnapshot(className, level), [className, level]);

  if (!snapshot) return null;

  return (
    <main className="class-progression-lab">
      <header className="progression-hero">
        <span><ListChecks size={18} /> Frontend-only progression testing</span>
        <h1>Class Progressions</h1>
        <p>Check each 2014 class level-by-level before wiring deeper level-up automation.</p>
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
          <input type="number" min="1" max="20" value={level} onChange={event => setLevel(event.target.value)} />
        </label>
      </section>

      <section className="progression-summary-grid">
        <article><span>Class</span><strong>{snapshot.className}</strong><em>{snapshot.spellcasting === 'none' ? 'Non-caster' : `${snapshot.spellcasting} caster`}</em></article>
        <article><span>Level</span><strong>{snapshot.level}</strong><em>{snapshot.nextLevel ? `Next: ${snapshot.nextLevel}` : 'Max level'}</em></article>
        <article><span>Proficiency</span><strong>+{snapshot.proficiencyBonus}</strong><em>{snapshot.nextProficiencyBonus && snapshot.nextProficiencyBonus !== snapshot.proficiencyBonus ? `Next +${snapshot.nextProficiencyBonus}` : 'No change next'}</em></article>
        <article><span>Hit Die</span><strong>{snapshot.hitDie}</strong><em>{snapshot.savingThrows.join(' / ')}</em></article>
        <article><span>Subclass</span><strong>Lv {snapshot.subclassLevel}</strong><em>{snapshot.level >= snapshot.subclassLevel ? 'Chosen by this level' : 'Still to choose'}</em></article>
        <article><span>ASI Levels</span><strong>{snapshot.asiLevels.join(', ')}</strong><em>{snapshot.asiLevels.includes(snapshot.level) ? 'ASI now' : '—'}</em></article>
      </section>

      <section className="progression-columns">
        <FeatureList title={`Level ${snapshot.level} unlocks`} features={snapshot.currentFeatures} />
        <FeatureList title={snapshot.nextLevel ? `Level ${snapshot.nextLevel} next` : 'Next level'} features={snapshot.nextFeatures} />
      </section>

      <section className="progression-card progression-card--wide">
        <h2>Spell slots</h2>
        <div className="progression-slot-compare">
          <div><span>Current</span><SlotPills slots={snapshot.currentSpellSlots} /></div>
          <ArrowRight size={18} />
          <div><span>Next</span><SlotPills slots={snapshot.nextSpellSlots} /></div>
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
                <strong>{String(resource.currentValue ?? '—')}</strong>
                <em>{resource.restore}</em>
                {resource.nextValue !== resource.currentValue && <small>Next: {String(resource.nextValue ?? '—')}</small>}
              </div>
            ))}
          </div>
        ) : <p className="progression-empty">No core class resource tracked for this class yet.</p>}
      </section>
    </main>
  );
}
