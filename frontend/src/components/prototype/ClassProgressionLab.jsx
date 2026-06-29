import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Home, Info, ListChecks, RotateCcw, Save, Shield, Sparkles, UserRound } from 'lucide-react';

import { CLASS_NAMES_2014, clampLevel, getProgressionSnapshot } from '@/data/classProgressions2014';
import { getAllClassProgressionAudits, getClassProgressionAudit, getProgressionAuditSummary } from '@/data/classProgressionAudit2014';
import { getLevelUpProgressionPreview, getPlayerSheetProgression, getRookLevelUpSuggestions } from '@/data/playerProgressionView2014';
import './ClassProgressionLab.css';
import './ClassProgressionLabRook.css';

const LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);
const ROOK_LAB_STORAGE_KEY = 'rookie-quest:prototype-progressions:rook-test-character';

const DEFAULT_ROOK_TEST_CHARACTER = {
  name: 'Rook test hero',
  character_class: 'Warlock',
  level: 1,
  backstory: 'A protective adventurer with secrets, old wounds, and a need to keep their friends alive.',
  notes: 'Testing Rook suggestions, known spell swaps, ASI / feat prompts, and what must stay hidden until level-up.',
};

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

function getAuditIcon(level) {
  if (level === 'danger') return <AlertTriangle size={16} />;
  if (level === 'warning') return <AlertTriangle size={16} />;
  return <Info size={16} />;
}

function sanitiseRookTestCharacter(character = {}) {
  const safeClass = CLASS_NAMES_2014.includes(character.character_class)
    ? character.character_class
    : DEFAULT_ROOK_TEST_CHARACTER.character_class;

  return {
    name: character.name || DEFAULT_ROOK_TEST_CHARACTER.name,
    character_class: safeClass,
    level: clampLevel(character.level || DEFAULT_ROOK_TEST_CHARACTER.level),
    backstory: character.backstory || '',
    notes: character.notes || '',
  };
}

function loadRookTestCharacter() {
  if (typeof window === 'undefined') return DEFAULT_ROOK_TEST_CHARACTER;

  try {
    const saved = window.localStorage.getItem(ROOK_LAB_STORAGE_KEY);
    if (!saved) return DEFAULT_ROOK_TEST_CHARACTER;
    return sanitiseRookTestCharacter({
      ...DEFAULT_ROOK_TEST_CHARACTER,
      ...JSON.parse(saved),
    });
  } catch (error) {
    return DEFAULT_ROOK_TEST_CHARACTER;
  }
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

function AuditPanel({ audit, summary }) {
  return (
    <section className="progression-card progression-card--wide progression-audit-panel">
      <div className="progression-audit-header">
        <div>
          <h2>Progression audit</h2>
          <p>Checks whether this level is safe to trust before we wire it into real level-up automation.</p>
        </div>
        <div className={`progression-audit-status progression-audit-status--${audit.status}`}>
          {audit.status === 'ready' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {audit.status === 'ready' ? 'Ready' : audit.status === 'danger' ? 'Needs fixing' : 'Needs review'}
        </div>
      </div>

      <div className="progression-audit-counts" aria-label="Progression audit summary">
        <article><span>Ready</span><strong>{summary.readyClasses}</strong><em>classes at level {summary.level}</em></article>
        <article><span>Warnings</span><strong>{summary.warningCount}</strong><em>review items</em></article>
        <article><span>Danger</span><strong>{summary.dangerCount}</strong><em>blocking issues</em></article>
        <article><span>Total</span><strong>{summary.totalIssues}</strong><em>audit notes</em></article>
      </div>

      {audit.issues.length ? (
        <div className="progression-audit-list">
          {audit.issues.map((issue, index) => (
            <div key={`${issue.level}-${issue.message}-${index}`} className={`progression-audit-issue progression-audit-issue--${issue.level}`}>
              {getAuditIcon(issue.level)}
              <span>{issue.level}</span>
              <p>{issue.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="progression-audit-ready">No audit issues found for {audit.className} level {audit.level}.</p>
      )}
    </section>
  );
}

function SheetLevelUpSplitPanel({ sheetView, levelUpPreview }) {
  if (!sheetView) return null;
  return (
    <section className="progression-card progression-card--wide progression-visibility-panel">
      <div>
        <h2>Character page vs level-up split</h2>
        <p>{sheetView.principle}</p>
      </div>
      <div className="progression-visibility-grid">
        <article>
          <span>Character page shows now</span>
          <strong>{sheetView.currentFeatures.length}</strong>
          <em>owned features up to level {sheetView.level}</em>
          <ul>
            <li>Current resources only: {sheetView.currentResources.length ? sheetView.currentResources.map(resource => resource.label).join(', ') : 'none tracked yet'}</li>
            <li>Current spell slots only: {Object.keys(sheetView.currentSpellSlots || {}).length ? 'shown' : 'none'}</li>
            <li>No future subclasses, ASIs, feats, spells, or spell swaps should be teased on the live sheet.</li>
          </ul>
        </article>
        <article>
          <span>Level-up owns next</span>
          <strong>{levelUpPreview?.toLevel || '—'}</strong>
          <em>{levelUpPreview ? `from level ${levelUpPreview.fromLevel}` : 'max level or no preview'}</em>
          <ul>
            <li>Next features: {levelUpPreview?.gainedFeatures?.length ? levelUpPreview.gainedFeatures.join(', ') : 'none'}</li>
            <li>Subclass choice: {levelUpPreview?.willChooseSubclass ? 'yes' : 'not this level'}</li>
            <li>ASI / feat choice: {levelUpPreview?.willChooseAsi ? 'yes' : 'not this level'}</li>
            <li>Known spell swap: {levelUpPreview?.spellReplacementOption ? `${levelUpPreview.spellReplacementOption.label} — ${levelUpPreview.spellReplacementOption.timing}` : 'not this class'}</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function LevelUpDeltaPanel({ levelUpPreview }) {
  if (!levelUpPreview) {
    return (
      <section className="progression-card progression-card--wide progression-delta-panel">
        <h2>Next level handoff</h2>
        <p className="progression-empty">This character is already at level 20, so there is no next-level automation preview.</p>
      </section>
    );
  }

  return (
    <section className="progression-card progression-card--wide progression-delta-panel">
      <div>
        <h2>Next level handoff</h2>
        <p>Use this as the checklist for what the real level-up flow will need to reveal, update, or ask the player.</p>
      </div>
      <div className="progression-delta-grid">
        <article>
          <span>Features gained</span>
          <strong>{levelUpPreview.gainedFeatures.length || '—'}</strong>
          <ul>
            {levelUpPreview.gainedFeatures.length
              ? levelUpPreview.gainedFeatures.map(feature => <li key={feature}>{feature}</li>)
              : <li>No new listed features.</li>}
          </ul>
        </article>
        <article>
          <span>Player choices</span>
          <strong>{[levelUpPreview.willChooseSubclass, levelUpPreview.willChooseAsi, levelUpPreview.spellReplacementOption].filter(Boolean).length || '—'}</strong>
          <ul>
            <li>Subclass: {levelUpPreview.willChooseSubclass ? 'ask now' : 'not this level'}</li>
            <li>ASI / feat: {levelUpPreview.willChooseAsi ? 'ask now' : 'not this level'}</li>
            <li>Known spell swap: {levelUpPreview.spellReplacementOption ? 'offer optional swap' : 'not available'}</li>
          </ul>
        </article>
        <article>
          <span>Spell slot changes</span>
          <strong>{levelUpPreview.spellSlotChanges.length || '—'}</strong>
          <ul>
            {levelUpPreview.spellSlotChanges.length
              ? levelUpPreview.spellSlotChanges.map(change => <li key={change.slotLevel}>Lv {change.slotLevel}: {change.from} → {change.to}</li>)
              : <li>No spell slot change.</li>}
          </ul>
        </article>
        <article>
          <span>Resource changes</span>
          <strong>{levelUpPreview.resourceChanges.length || '—'}</strong>
          <ul>
            {levelUpPreview.resourceChanges.length
              ? levelUpPreview.resourceChanges.map(change => <li key={change.key}>{change.label}: {formatResourceValue(change.from)} → {formatResourceValue(change.to)}</li>)
              : <li>No tracked resource change.</li>}
          </ul>
        </article>
      </div>
    </section>
  );
}

function RookTestCharacterPanel({ testCharacter, saveStatus, onChange, onReset }) {
  return (
    <section className="progression-card progression-card--wide progression-rook-tester">
      <div className="progression-rook-tester-header">
        <div>
          <span><UserRound size={16} /> Local Rook test character</span>
          <h2>Rook suggestion tester</h2>
          <p>Change the test hero’s story and notes to see whether Rook’s level-up ideas react properly before this touches real character data.</p>
        </div>
        <div className="progression-save-pill"><Save size={14} /> {saveStatus}</div>
      </div>

      <div className="progression-rook-form">
        <label>
          <span>Test name</span>
          <input
            type="text"
            value={testCharacter.name}
            onChange={event => onChange({ ...testCharacter, name: event.target.value })}
          />
        </label>
        <label className="progression-rook-field--wide">
          <span>Backstory / bonds / flaws</span>
          <textarea
            rows={4}
            value={testCharacter.backstory}
            onChange={event => onChange({ ...testCharacter, backstory: event.target.value })}
          />
        </label>
        <label className="progression-rook-field--wide">
          <span>Build notes / table behaviour</span>
          <textarea
            rows={3}
            value={testCharacter.notes}
            onChange={event => onChange({ ...testCharacter, notes: event.target.value })}
          />
        </label>
      </div>

      <button type="button" className="progression-rook-reset" onClick={onReset}>
        <RotateCcw size={16} /> Reset local test hero
      </button>
    </section>
  );
}

function RookSuggestionsPanel({ advice, characterName }) {
  if (!advice) return null;
  return (
    <section className="progression-card progression-card--wide progression-rook-panel">
      <div className="progression-rook-header">
        <div>
          <h2>Rook level-up suggestion scaffold</h2>
          <p>{advice.summary}</p>
        </div>
        <span>{characterName || 'Test hero'} · Level {advice.fromLevel} → {advice.toLevel}</span>
      </div>
      {advice.backstoryReasons.length > 0 && (
        <div className="progression-rook-reasons">
          {advice.backstoryReasons.map(reason => <p key={reason}>Rook noticed: {reason}</p>)}
        </div>
      )}
      <div className="progression-rook-grid">
        {advice.suggestions.map(suggestion => (
          <article key={suggestion.type}>
            <span>{suggestion.title}</span>
            <strong>{suggestion.options.length ? suggestion.options.join(', ') : 'No suggestion yet'}</strong>
            <em>{suggestion.reason}</em>
          </article>
        ))}
      </div>
      <p className="progression-rook-note">This is a rules-based scaffold for testing. When wired into the real level-up flow, it should use the character’s actual backstory, notes, class, ability scores, current spells, and choices.</p>
    </section>
  );
}

function ClassComparisonTable({ snapshots, audits, selectedClass }) {
  const auditMap = new Map(audits.map(audit => [audit.className, audit]));

  return (
    <section className="progression-card progression-card--wide">
      <h2>All classes at this level</h2>
      <div className="progression-table-wrap">
        <table className="progression-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Audit</th>
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
            {snapshots.map(row => {
              const audit = auditMap.get(row.className);
              return (
                <tr key={row.className} className={row.className === selectedClass ? 'is-selected' : undefined}>
                  <td>{row.className}</td>
                  <td><span className={`progression-audit-chip progression-audit-chip--${audit?.status || 'ready'}`}>{audit?.status || 'ready'}</span></td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ClassProgressionLab() {
  const [testCharacter, setTestCharacter] = useState(loadRookTestCharacter);
  const [saveStatus, setSaveStatus] = useState('Saved locally');

  const className = testCharacter.character_class;
  const level = clampLevel(testCharacter.level);
  const snapshot = useMemo(() => getProgressionSnapshot(className, level), [className, level]);
  const audit = useMemo(() => getClassProgressionAudit(className, level), [className, level]);
  const auditSummary = useMemo(() => getProgressionAuditSummary(level), [level]);
  const sheetView = useMemo(() => getPlayerSheetProgression(className, level), [className, level]);
  const levelUpPreview = useMemo(() => getLevelUpProgressionPreview(className, level), [className, level]);
  const rookAdvice = useMemo(() => getRookLevelUpSuggestions({
    ...testCharacter,
    character_class: className,
    className,
    notes: testCharacter.notes,
  }, level), [className, level, testCharacter]);
  const comparisonSnapshots = useMemo(
    () => CLASS_NAMES_2014.map(name => getProgressionSnapshot(name, level)).filter(Boolean),
    [level]
  );
  const comparisonAudits = useMemo(() => getAllClassProgressionAudits(level), [level]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(ROOK_LAB_STORAGE_KEY, JSON.stringify(sanitiseRookTestCharacter(testCharacter)));
      setSaveStatus('Saved locally');
    } catch (error) {
      setSaveStatus('Local save failed');
    }
  }, [testCharacter]);

  function updateTestCharacter(nextCharacter) {
    setTestCharacter(sanitiseRookTestCharacter(nextCharacter));
  }

  if (!snapshot) return null;

  return (
    <main className="class-progression-lab">
      <header className="progression-hero">
        <span><ListChecks size={18} /> Frontend-only progression testing</span>
        <h1>Class Progressions</h1>
        <p>Check every 2014 class level-by-level before wiring level-up automation, rest recovery, resources, spell slots, spell swaps, and Rook suggestions into the live sheet.</p>
        <div className="progression-actions">
          <Link to="/prototype"><Home size={16} /> Prototype Hub</Link>
          <Link to="/prototype-mobile"><Shield size={16} /> Class Test Lab</Link>
        </div>
      </header>

      <section className="progression-controls">
        <label>
          <span>Class</span>
          <select value={className} onChange={event => updateTestCharacter({ ...testCharacter, character_class: event.target.value })}>
            {CLASS_NAMES_2014.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>
          <span>Current level</span>
          <input type="number" min="1" max="20" value={level} onChange={event => updateTestCharacter({ ...testCharacter, level: event.target.value })} />
        </label>
      </section>

      <section className="progression-level-grid" aria-label="Level shortcuts">
        {LEVELS.map(levelOption => (
          <button
            key={levelOption}
            type="button"
            className={levelOption === snapshot.level ? 'is-active' : undefined}
            onClick={() => updateTestCharacter({ ...testCharacter, level: levelOption })}
          >
            {levelOption}
          </button>
        ))}
      </section>

      <RookTestCharacterPanel
        testCharacter={testCharacter}
        saveStatus={saveStatus}
        onChange={updateTestCharacter}
        onReset={() => updateTestCharacter(DEFAULT_ROOK_TEST_CHARACTER)}
      />

      <AuditPanel audit={audit} summary={auditSummary} />
      <SheetLevelUpSplitPanel sheetView={sheetView} levelUpPreview={levelUpPreview} />
      <LevelUpDeltaPanel levelUpPreview={levelUpPreview} />
      <RookSuggestionsPanel advice={rookAdvice} characterName={testCharacter.name} />

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

      <ClassComparisonTable snapshots={comparisonSnapshots} audits={comparisonAudits} selectedClass={snapshot.className} />

      <section className="progression-card progression-card--wide">
        <h2>Progression audit checklist</h2>
        <ul>
          <li>Character pages should only show current usable class data.</li>
          <li>Future subclasses, ASIs, feats, spells, spell swaps, and next-level features belong in level-up only.</li>
          <li>Rook suggestions should be optional and based on class, current build, backstory, and available choices.</li>
          <li>Use this page as the source check before adding level-up automation to real characters.</li>
        </ul>
      </section>
    </main>
  );
}
