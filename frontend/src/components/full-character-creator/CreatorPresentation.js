import React from 'react';
import { Check } from 'lucide-react';

import { EXTRA_LANGUAGE_OPTIONS } from '@/data/languageChoiceUtils';

export function Title({ icon: Icon, title, text }) {
  return <div className="full-creator-section-title"><Icon size={21} /><div><h2>{title}</h2><p>{text}</p></div></div>;
}

export function Chip({ active, onClick, children }) {
  return (
    <button type="button" className={active ? 'active' : ''} aria-pressed={Boolean(active)} onClick={onClick}>
      {active && <Check className="full-creator-choice-check" size={14} aria-hidden="true" />}
      <span className="full-creator-choice-label">{children}</span>
    </button>
  );
}

export function Choice({ title, children, interactive = false }) {
  return <section className={`full-creator-choice-block ${interactive ? 'is-interactive' : 'is-reference'}`}><h3>{title}</h3><div>{children}</div></section>;
}

export function LanguagePicker({ title, count, selected = [], unavailable = [], onToggle }) {
  if (!count) return null;
  const blocked = new Set(unavailable);
  const options = Array.from(new Set([...selected, ...EXTRA_LANGUAGE_OPTIONS]))
    .filter((language) => selected.includes(language) || !blocked.has(language));
  return (
    <Choice title={`${title} ${selected.length}/${count}`} interactive>
      {options.map((language) => (
        <Chip
          key={language}
          active={selected.includes(language)}
          onClick={() => onToggle(language)}
        >
          {language}
        </Chip>
      ))}
    </Choice>
  );
}

export function ReadinessPanel({ report }) {
  const isReady = !report.priority.length && !report.later.length;
  return (
    <section className="full-creator-readiness-panel">
      <div className="full-creator-readiness-hero">
        <strong>{report.priority.length ? 'Priority fixes needed' : isReady ? 'Ready to create' : 'Create now, finish later'}</strong>
        <span>{report.priority.length ? 'These must be fixed before the character sheet can be created.' : isReady ? 'Everything important looks ready for the first saved sheet.' : 'No blockers found. These reminders can be handled after saving.'}</span>
      </div>
      {report.priority.length > 0 && <ReadinessList title="Priority" tone="priority" items={report.priority} />}
      {report.later.length > 0 && <ReadinessList title="Can finish later" tone="later" items={report.later} />}
      {!report.priority.length && !report.later.length && <ReadinessList title="Ready" tone="ready" items={report.complete.slice(0, 7)} />}
    </section>
  );
}

function ReadinessList({ title, tone, items }) {
  return (
    <div className={`full-creator-readiness-list ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

export function ReviewItem({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
