import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Search } from 'lucide-react';

import { runCharacterAuditSuite } from '@/data/characterAuditReport';
import './AdminCharacterAuditTab.css';

function ResultCard({ result }) {
  const failed = result.problems.length > 0;
  const character = result.character || {};
  const snapshot = result.snapshot || {};

  return (
    <article className={`admin-character-audit-card ${failed ? 'has-problems' : 'is-clean'}`}>
      <div className="admin-character-audit-card__head">
        <div>
          <strong>{result.label}</strong>
          <span>{character.character_class || snapshot.identity?.primaryClass || 'Class'} • Lv {character.level || snapshot.identity?.level || '?'}</span>
        </div>
        <em>{failed ? `${result.problems.length} issue${result.problems.length === 1 ? '' : 's'}` : 'Pass'}</em>
      </div>
      {failed ? (
        <ul>
          {result.problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      ) : (
        <p>No audit problems found.</p>
      )}
    </article>
  );
}

export default function AdminCharacterAuditTab() {
  const [filter, setFilter] = useState('problems');
  const [search, setSearch] = useState('');
  const suite = useMemo(() => runCharacterAuditSuite(), []);
  const allResults = useMemo(() => ([
    ...suite.demoResults.map((result) => ({ ...result, group: 'demo' })),
    ...suite.progressionResults.map((result) => ({ ...result, group: 'progression' })),
  ]), [suite]);
  const failureCount = suite.report.failed;
  const passCount = suite.report.passed;
  const lowerSearch = search.trim().toLowerCase();
  const visibleResults = allResults.filter((result) => {
    if (filter === 'problems' && result.problems.length === 0) return false;
    if (filter === 'demo' && result.group !== 'demo') return false;
    if (filter === 'progression' && result.group !== 'progression') return false;
    if (!lowerSearch) return true;
    return `${result.label} ${result.character?.name || ''} ${result.character?.character_class || ''} ${result.character?.subclass || ''} ${result.problems.join(' ')}`.toLowerCase().includes(lowerSearch);
  });

  return (
    <div className="admin-character-audit">
      <header className="admin-character-audit__hero">
        <div>
          <p>Character Testing</p>
          <h2><FlaskConical size={21} /> Character Audit Lab</h2>
          <span>Checks demo fixtures plus every core class from level 1 to 20 for spells, slots, features, equipment, HP and AC.</span>
        </div>
        <div className={`admin-character-audit__status ${failureCount ? 'bad' : 'good'}`}>
          {failureCount ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
          <strong>{failureCount ? `${failureCount} failing` : 'All clear'}</strong>
          <span>{passCount}/{suite.report.total} passing</span>
        </div>
      </header>

      <section className="admin-character-audit__stats" aria-label="Audit totals">
        <div><span>Total</span><strong>{suite.report.total}</strong></div>
        <div><span>Passing</span><strong>{passCount}</strong></div>
        <div><span>Failing</span><strong>{failureCount}</strong></div>
        <div><span>Demo</span><strong>{suite.demoResults.length}</strong></div>
        <div><span>Class Levels</span><strong>{suite.progressionResults.length}</strong></div>
      </section>

      <section className="admin-character-audit__tools">
        <label>
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search class, level, subclass or error…" />
        </label>
        <div>
          {[
            ['problems', 'Problems'],
            ['all', 'All'],
            ['demo', 'Demo'],
            ['progression', '1–20'],
          ].map(([id, label]) => (
            <button key={id} type="button" className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      </section>

      <section className="admin-character-audit__report">
        <div className="admin-character-audit__report-head">
          <h3>{visibleResults.length} result{visibleResults.length === 1 ? '' : 's'} shown</h3>
          <span>{filter === 'problems' ? 'Showing only problems by default' : `Filter: ${filter}`}</span>
        </div>
        {visibleResults.length ? (
          <div className="admin-character-audit__grid">
            {visibleResults.map((result) => <ResultCard key={`${result.group}-${result.label}`} result={result} />)}
          </div>
        ) : (
          <div className="admin-character-audit__empty">
            <CheckCircle2 size={34} />
            <strong>No results match this view.</strong>
            <span>That is good news if you are looking at Problems.</span>
          </div>
        )}
      </section>

      <section className="admin-character-audit__plain-report">
        <h3>Plain report text</h3>
        <pre>{suite.report.text}</pre>
      </section>
    </div>
  );
}
