import React from 'react';

import {
  ABILITY_OPTIONS,
  defaultAsiSelection,
  getFeatName,
  normaliseSpellSelection,
  normaliseWarlockSelection,
} from '@/data/startingLevelChoiceEngine';
import './StartingLevelChoices.css';

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

function toggleValue(list, value, max = Infinity) {
  const current = arr(list);
  if (current.includes(value)) return current.filter((item) => item !== value);
  if (current.length >= max) return current;
  return [...current, value];
}

function optionValue(option) {
  if (typeof option === 'string') return option;
  return option?.name || String(option || '');
}

function optionLabel(option) {
  if (typeof option === 'string') return option;
  if (option?.level !== undefined && option?.level !== null) return `Level ${option.level}: ${option.name}`;
  return option?.name || String(option || '');
}

function ToggleChoiceList({ label, value, options, max, onChange }) {
  const [query, setQuery] = React.useState('');
  if (!max) return null;

  const selected = arr(value);
  const choices = arr(options);
  const searchable = choices.length > 12;
  const normalisedQuery = query.trim().toLowerCase();
  const visibleChoices = choices
    .filter((option) => !normalisedQuery || optionLabel(option).toLowerCase().includes(normalisedQuery))
    .sort((left, right) => {
      const leftSelected = selected.includes(optionValue(left));
      const rightSelected = selected.includes(optionValue(right));
      if (leftSelected === rightSelected) return 0;
      return leftSelected ? -1 : 1;
    });

  return (
    <fieldset className="full-creator-toggle-field">
      <legend>
        <span>{label}</span>
        <strong>{selected.length}/{max} selected</strong>
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
          const valueKey = optionValue(option);
          const active = selected.includes(valueKey);
          const unavailable = !active && selected.length >= max;
          return (
            <button
              key={`${option?.level ?? 'choice'}-${valueKey}`}
              type="button"
              className={`full-creator-toggle-option${active ? ' active' : ''}`}
              aria-pressed={active}
              disabled={unavailable}
              onClick={() => onChange(toggleValue(selected, valueKey, max))}
            >
              <span>{optionLabel(option)}</span>
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

export function AsiChoiceRow({ choice, selection, featOptions, onChange }) {
  const current = defaultAsiSelection(selection);
  const firstFeat = getFeatName(featOptions[0]) || '';
  const update = (patch) => onChange({ ...current, ...patch });

  return (
    <div className="full-creator-form-grid" key={choice.id}>
      <label>
        <span>{choice.label}</span>
        <select value={current.mode} onChange={(event) => update({ mode: event.target.value, featName: event.target.value === 'feat' ? current.featName || firstFeat : current.featName })}>
          <option value="asi">Ability score increase</option>
          <option value="feat">Feat</option>
        </select>
      </label>
      {current.mode === 'feat' ? (
        <label>
          <span>Feat</span>
          <select value={current.featName || firstFeat} onChange={(event) => update({ featName: event.target.value })}>
            {featOptions.map((feat) => <option key={getFeatName(feat)} value={getFeatName(feat)}>{getFeatName(feat)}</option>)}
          </select>
        </label>
      ) : (
        <>
          <label>
            <span>First +1</span>
            <select value={current.abilityOne} onChange={(event) => update({ abilityOne: event.target.value })}>
              {ABILITY_OPTIONS.map(([ability, label]) => <option key={ability} value={ability}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Second +1 (same ability = +2)</span>
            <select value={current.abilityTwo} onChange={(event) => update({ abilityTwo: event.target.value })}>
              {ABILITY_OPTIONS.map(([ability, label]) => <option key={ability} value={ability}>{label}</option>)}
            </select>
          </label>
        </>
      )}
    </div>
  );
}

export function SpellChoiceSection({ plan, selection, onChange }) {
  if (!plan?.hasKnownSpellPicker && !plan?.hasPreparedSpellPicker && !plan?.cantripTarget) return null;
  const current = normaliseSpellSelection(selection, plan);
  const update = (patch) => onChange({ ...current, ...patch });
  const cantripTarget = Number(plan.cantripTarget || 0);
  const knownTarget = Number(plan.knownTarget || 0);
  const preparedTarget = Number(plan.preparedTarget || 0);

  return (
    <section className="full-creator-auto-box" aria-label="Higher-level spell choices">
      <strong>Higher-level spells</strong>
      <span>
        Choose the spell options for this starting level. Known spells are saved as known spells;
        prepared spells are saved as the character’s prepared list.
      </span>

      <ToggleChoiceList
        label="Cantrips"
        value={current.cantrips}
        options={plan.cantripOptions}
        max={cantripTarget}
        onChange={(cantrips) => update({ cantrips })}
      />

      <ToggleChoiceList
        label="Known spells"
        value={current.spells}
        options={plan.spellOptions}
        max={knownTarget}
        onChange={(spells) => update({ spells })}
      />

      <ToggleChoiceList
        label="Prepared spells"
        value={current.prepared}
        options={plan.spellOptions}
        max={preparedTarget}
        onChange={(prepared) => update({ prepared })}
      />

      {arr(plan.arcanumLevels).length > 0 && (
        <small>Mystic Arcanum is tracked on save when matching high-level spell options are available in the spell database.</small>
      )}
    </section>
  );
}

export function WarlockChoiceSection({ plan, selection, onChange }) {
  if (!plan?.invocationsRequired && !plan?.pactBoonRequired) return null;
  const current = normaliseWarlockSelection(selection, plan);
  const update = (patch) => onChange({ ...current, ...patch });
  const count = Number(plan.invocationCount || 0);

  return (
    <section className="full-creator-auto-box" aria-label="Warlock choices">
      <strong>Warlock choices</strong>
      <span>Pact Boon and Eldritch Invocations are applied to the saved sheet.</span>

      {plan.pactBoonRequired && (
        <label className="full-creator-wide-label">
          <span>Pact Boon</span>
          <select value={current.pactBoon} onChange={(event) => update({ pactBoon: event.target.value })}>
            <option value="">Choose…</option>
            {arr(plan.pactBoonOptions).map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}
          </select>
        </label>
      )}

      <ToggleChoiceList
        label="Eldritch Invocations"
        value={current.invocations}
        options={plan.invocationOptions}
        max={count}
        onChange={(invocations) => update({ invocations })}
      />
    </section>
  );
}
