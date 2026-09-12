import React from 'react';

import { normaliseClassSpecificSelection } from '@/data/classSpecificChoiceEngine';
import './StartingLevelChoices.css';

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

function toggleValue(list, value, max = Infinity) {
  const current = arr(list);
  if (current.includes(value)) return current.filter((item) => item !== value);
  if (current.length >= max) return current;
  return [...current, value];
}

function MultiSelectField({ label, value, options, target, onChange }) {
  const [query, setQuery] = React.useState('');
  if (!target) return null;

  const selected = arr(value);
  const choices = arr(options);
  const searchable = choices.length > 12;
  const normalisedQuery = query.trim().toLowerCase();
  const visibleChoices = choices
    .filter((option) => !normalisedQuery || option.toLowerCase().includes(normalisedQuery))
    .sort((left, right) => {
      const leftSelected = selected.includes(left);
      const rightSelected = selected.includes(right);
      if (leftSelected === rightSelected) return 0;
      return leftSelected ? -1 : 1;
    });

  return (
    <fieldset className="full-creator-toggle-field">
      <legend>
        <span>{label}</span>
        <strong>{selected.length}/{target} selected</strong>
      </legend>
      {searchable && (
        <label className="full-creator-toggle-search">
          <span>Search {label.toLowerCase()}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
          />
        </label>
      )}
      <div className="full-creator-toggle-grid">
        {visibleChoices.map((option) => {
          const active = selected.includes(option);
          const unavailable = !active && selected.length >= target;
          return (
            <button
              key={option}
              type="button"
              className={`full-creator-toggle-option${active ? ' active' : ''}`}
              aria-pressed={active}
              disabled={unavailable}
              onClick={() => onChange(toggleValue(selected, option, target))}
            >
              <span>{option}</span>
              <small>{active ? 'Selected' : unavailable ? 'Limit reached' : 'Choose'}</small>
            </button>
          );
        })}
      </div>
      {searchable && visibleChoices.length === 0 && (
        <p className="full-creator-toggle-empty">No matching options.</p>
      )}
    </fieldset>
  );
}

export default function StartingLevelClassSpecificChoices({ plan, selection, onChange }) {
  if (!plan?.hasChoices) return null;
  const current = normaliseClassSpecificSelection(selection, plan);
  const update = (patch) => onChange({ ...current, ...patch });

  return (
    <section className="full-creator-progress-card" aria-label="Class-specific starting level choices">
      <div className="full-creator-progress-heading">
        <span>Class-specific choices</span>
        <strong>{plan.className} level {plan.level}</strong>
      </div>
      <p>Choose the class details that unlock as this character starts above level 1. These are applied to the saved sheet.</p>

      <div className="full-creator-auto-box">
        <strong>Unlocked choices</strong>
        <span>
          {[
            plan.fightingStyleTarget ? 'Fighting Style' : '',
            plan.expertiseTarget ? 'Expertise' : '',
            plan.metamagicTarget ? 'Metamagic' : '',
            plan.maneuverTarget ? 'Battle Master maneuvers' : '',
          ].filter(Boolean).join(' • ')}
        </span>
      </div>

      <MultiSelectField
        label="Fighting Style"
        value={current.fightingStyles}
        options={plan.options?.fightingStyles}
        target={plan.fightingStyleTarget}
        onChange={(fightingStyles) => update({ fightingStyles })}
      />
      <MultiSelectField
        label="Expertise skills"
        value={current.expertise}
        options={plan.options?.expertiseSkills}
        target={plan.expertiseTarget}
        onChange={(expertise) => update({ expertise })}
      />
      <MultiSelectField
        label="Metamagic options"
        value={current.metamagic}
        options={plan.options?.metamagic}
        target={plan.metamagicTarget}
        onChange={(metamagic) => update({ metamagic })}
      />
      <MultiSelectField
        label="Battle Master maneuvers"
        value={current.maneuvers}
        options={plan.options?.maneuvers}
        target={plan.maneuverTarget}
        onChange={(maneuvers) => update({ maneuvers })}
      />
    </section>
  );
}
