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

function MultiSelectField({ label, value, options, target, onChange, help = '' }) {
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
      {help && <p className="full-creator-toggle-help">{help}</p>}
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
              aria-disabled={unavailable}
              onClick={() => {
                if (unavailable) return;
                onChange(toggleValue(selected, option, target));
              }}
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
  const fixedOrigin = arr(plan.fixedOriginLanguages);
  const fixedClass = arr(plan.fixedLanguages);

  return (
    <section className="full-creator-progress-card" aria-label="Starting level character choices">
      <div className="full-creator-progress-heading">
        <span>Starting-level choices</span>
        <strong>{plan.className} level {plan.level}</strong>
      </div>
      <p>Choose the origin and class details that apply at this starting level. These choices are written directly to the saved character sheet.</p>

      <div className="full-creator-auto-box">
        <strong>Choices to finish</strong>
        <span>
          {[
            plan.originLanguageTarget ? 'Starting languages' : '',
            plan.fightingStyleTarget ? 'Fighting Style' : '',
            plan.expertiseTarget ? 'Expertise' : '',
            plan.metamagicTarget ? 'Metamagic' : '',
            plan.languageTarget || fixedClass.length ? 'Class languages' : '',
            plan.maneuverTarget ? 'Battle Master maneuvers' : '',
          ].filter(Boolean).join(' • ')}
        </span>
      </div>

      {fixedOrigin.length > 0 && (
        <div className="full-creator-auto-box">
          <strong>Language everyone starts with</strong>
          <span>{fixedOrigin.join(' • ')}</span>
        </div>
      )}

      <MultiSelectField
        label="Starting languages"
        value={current.originLanguages}
        options={plan.options?.originLanguages}
        target={plan.originLanguageTarget}
        help={plan.edition === '2024' ? 'Choose two Standard Languages in addition to Common.' : ''}
        onChange={(originLanguages) => update({ originLanguages })}
      />

      {fixedClass.length > 0 && (
        <div className="full-creator-auto-box">
          <strong>Granted class language</strong>
          <span>{fixedClass.join(' • ')}</span>
        </div>
      )}

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
        label="Class languages"
        value={current.languages}
        options={plan.options?.languages}
        target={plan.languageTarget}
        help={plan.languageTarget ? 'Class-granted languages are added on top of your starting languages.' : ''}
        onChange={(languages) => update({ languages })}
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
