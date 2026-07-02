import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Search } from 'lucide-react';

import { runCharacterAuditSuite } from '@/data/characterAuditReport';
import { auditCreatorSpellSelection, buildCreatorSpellSelectionReport } from '@/data/creatorSpellSelectionAudit';
import './AdminCharacterAuditTab.css';

const emptyCharacterReport = {
  demoResults: [],
  progressionResults: [],
  report: {
    total: 0,
    passed: 0,
    failed: 1,
    failures: [],
    text: 'Character audit could not start.',
  },
};

const emptyCreatorSpellReport = {
  total: 0,
  passed: 0,
  failed: 1,
  failures: [],
  text: 'Creator spell picker audit could not start.',
};

function buildAuditErrorResult(label, error) {
  return {
    label,
    group: 'error',
    character: { name: label, character_class: 'Audit', level: '?' },
    snapshot: { identity: { primaryClass: 'Audit', level: '?' } },
    problems: [`${label}: ${error?.message || String(error)}`],
  };
}

function runSafeCharacterAudit() {
  try {
    return { suite: runCharacterAuditSuite(), errorResult: null };
  } catch (error) {
    return {
      suite: emptyCharacterReport,
      errorResult: buildAuditErrorResult('Character Audit Startup', error),
    };
  }
}

function runSafeCreatorSpellAudit() {
  try {
    const results = auditCreatorSpellSelection();
    return { results, report: buildCreatorSpellSelectionReport(results), errorResult: null };
  } catch (error) {
    return {
      results: [],
      report: emptyCreatorSpellReport,
      errorResult: {
        className: 'Creator Spell Audit Startup',
        requirements: { cantrips: 0, spells: 0, type: 'error' },
        pools: { cantrips: [], levelOneSpells: [] },
        problems: [`Creator Spell Audit Startup: ${error?.message || String(error)}`],
      },
    };
  }
}

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

function CreatorSpellAuditCard({ result }) {
  const failed = result.problems.length > 0;
  return (
    <article className={`admin-character-audit-card ${failed ? 'has-problems' : 'is-clean'}`}>
      <div className="admin-character-audit-card__head">
        <div>
          <strong>{result.className}</strong>
          <span>{result.requirements.cantrips} cantrips • {result.requirements.spells} level 1 spells • {result.requirements.type}</span>
        </div>
        <em>{failed ? `${result.problems.length} issue${result.problems.length === 1 ? '' : 's'}` : 'Ready'}</em>
      </div>
      {failed ? (
        <ul>{result.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
      ) : (
        <p>{result.pools.cantrips.length} cantrips and {result.pools.levelOneSpells.length} level 1 spells available in the creator picker.</p>
      )}
    </article>
  );
}

export default function AdminCharacterAuditTab() {
  const [filter, setFilter] = useState('problems');
  const [search, setSearch] = useState('');
  const characterAudit = useMemo(() => runSafeCharacterAudit(), []);
  const creatorSpellAudit = useMemo(() => runSafeCreatorSpellAudit(), []);
  const suite = characterAudit.suite || emptyCharacterReport;
  const creatorSpellResults = creatorSpellAudit.results || [];
  const creatorSpellReport = creatorSpellAudit.report || emptyCreatorSpellReport;
  const allResults = useMemo(() => ([
    ...(characterAudit.errorResult ? [characterAudit.errorResult] : []),
    ...suite.demoResults.map((result) => ({ ...result, group: 'demo' })),
    ...suite.progressionResults.map((result) => ({ ...result, group: 'progression' })),
  ]), [suite, characterAudit.errorResult]);
  const allCreatorSpellResults = useMemo(() => ([
    ...(creatorSpellAudit.errorResult ? [creatorSpellAudit.errorResult] : []),
    ...creatorSpellResults,
  ]), [creatorSpellAudit.errorResult, creatorSpellResults]);
  const failureCount = suite.report.failed + creatorSpellReport.failed;
  const passCount = suite.report.passed + creatorSpellReport.passed;
  const totalCount = suite.report.total + creatorSpellReport.total;
  const lowerSearch = search.trim().toLowerCase();
  const visibleResults = allResults.filter((result) => {
    if (filter === 'problems' && result.problems.length === 0) return false;
    if (filter === 'demo' && result.group !== 'demo') return false;
    if (filter === 'progression' && result.group !== 'progression') return false;
    if (!lowerSearch) return true;
    return `${result.label} ${result.character?.name || ''} ${result.character?.character_class || ''} ${result.character?.subclass || ''} ${result.problems.join(' ')}`.toLowerCase().includes(lowerSearch);
  });
  const visibleCreatorSpellResults = allCreatorSpellResults.filter((result) => {
    if (filter === 'problems' && result.problems.length === 0) return false;
    if (!['problems', 'all'].includes(filter)) return false;
    if (!lowerSearch) return true;
    return `${result.className} ${result.problems.join(' ')}`.toLowerCase().includes(lowerSearch);
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
          <span>{passCount}/{totalCount} passing</span>
        </div>
      </header>

      <section className="admin-character-audit__phone-help">
        <strong>Using this from your phone</strong>
        <span>Open Admin Panel → Character Audit. The audit runs automatically in the page. Leave the filter on Problems, then screenshot the top status and any red problem cards. If there are no problem cards, tap All to spot-check demo characters and level 1–20 checks.</span>
      </section>

      <section className="admin-character-audit__stats" aria-label="Audit totals">
        <div><span>Total</span><strong>{totalCount}</strong></div>
        <div><span>Passing</span><strong>{passCount}</strong></div>
        <div><span>Failing</span><strong>{failureCount}</strong></div>
        <div><span>Demo</span><strong>{suite.demoResults.length}</strong></div>
        <div><span>Class Levels</span><strong>{suite.progressionResults.length}</strong></div>
        <div><span>Creator Spells</span><strong>{creatorSpellReport.total}</strong></div>
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
          <h3>{visibleResults.length + visibleCreatorSpellResults.length} result{visibleResults.length + visibleCreatorSpellResults.length === 1 ? '' : 's'} shown</h3>
          <span>{filter === 'problems' ? 'Showing only problems by default' : `Filter: ${filter}`}</span>
        </div>
        {visibleCreatorSpellResults.length > 0 && (
          <>
            <div className="admin-character-audit__report-head admin-character-audit__subhead">
              <h3>Creator spell picker</h3>
              <span>{creatorSpellReport.failed ? `${creatorSpellReport.failed} failing` : 'All creator spell pools ready'}</span>
            </div>
            <div className="admin-character-audit__grid">
              {visibleCreatorSpellResults.map((result) => <CreatorSpellAuditCard key={`creator-spell-${result.className}`} result={result} />)}
            </div>
          </>
        )}
        {visibleResults.length ? (
          <>
            <div className="admin-character-audit__report-head admin-character-audit__subhead">
              <h3>Character fixtures and levels</h3>
              <span>{suite.report.failed ? `${suite.report.failed} failing` : 'All character audits ready'}</span>
            </div>
            <div className="admin-character-audit__grid">
              {visibleResults.map((result) => <ResultCard key={`${result.group}-${result.label}`} result={result} />)}
            </div>
          </>
        ) : visibleCreatorSpellResults.length === 0 ? (
          <div className="admin-character-audit__empty">
            <CheckCircle2 size={34} />
            <strong>No results match this view.</strong>
            <span>That is good news if you are looking at Problems.</span>
          </div>
        ) : null}
      </section>

      <section className="admin-character-audit__plain-report">
        <h3>Plain report text</h3>
        <pre>{`${creatorSpellReport.text}\n\n${suite.report.text}`}</pre>
      </section>
    </div>
  );
}
