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

function optionDescription(option) {
  if (!option || typeof option === 'string') return '';
  if (option.prerequisiteNote) return option.prerequisiteNote;
  if (option.requiresInvocation) return `Requires ${option.requiresInvocation}.`;
  return option.description || option.summary || option.prerequisite || '';
}

function ToggleChoiceList({ label, value, options, max, onChange }) {
  const [query, setQuery] = React.useState('');
  const rawSelected = arr(value);
  const choices = arr(options);
  const allowedValues = React.useMemo(() => new Set(choices.map(optionValue)), [choices]);
  const selected = choices.length
    ? rawSelected.filter((selectedValue) => allowedValues.has(selectedValue)).slice(0, max || Infinity)
    : rawSelected.slice(0, max || Infinity);

  React.useEffect(() => {
    if (!choices.length || !max) return;
    const changed = rawSelected.length !== selected.length
      || rawSelected.some((selectedValue, index) => selectedValue !== selected[index]);
    if (changed) onChange(selected);
  }, [choices, max, onChange, rawSelected, selected]);

  if (!max) return null;

  const searchable = choices.length > 12;
  const normalisedQuery = query.trim().toLowerCase();
  const visibleChoices = choices
    .filter((option) => {
      if (!normalisedQuery) return true;
      return `${optionLabel(option)} ${optionDescription(option)}`.toLowerCase().includes(normalisedQuery);
    })
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
          const description = optionDescription(option);
          return (
            <button
              key={`${option?.level ?? 'choice'}-${valueKey}`}
              type="button"
              className={`full-creator-toggle-option${active ? ' active' : ''}`}
              aria-pressed={active}
              aria-disabled={unavailable}
              onClick={() => {
                if (unavailable) return;
                onChange(toggleValue(selected, valueKey, max));
              }}
            >
              <span>{optionLabel(option)}</span>
              {description && <em>{description}</em>}
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
        <ToggleChoiceList
          label="Feat"
          value={current.featName ? [current.featName] : firstFeat ? [firstFeat] : []}
          options={featOptions}
          max={1}
          onChange={(featNames) => update({ featName: featNames[0] || '' })}
        />
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
  if (!plan?.hasKnownSpellPicker && !plan?.hasSpellbookPicker && !plan?.hasPreparedSpellPicker && !plan?.cantripTarget) return null;
  const current = normaliseSpellSelection(selection, plan);
  const update = (patch) => onChange({ ...current, ...patch });
  const cantripTarget = Number(plan.cantripTarget || 0);
  const isSpellbook = plan.spellSelectionMode === 'spellbook';
  const permanentTarget = isSpellbook ? Number(plan.spellbookTarget || 0) : Number(plan.knownTarget || 0);
  const preparedTarget = Number(plan.preparedTarget || 0);
  const preparedOptions = isSpellbook
    ? arr(plan.spellOptions).filter((option) => current.spells.includes(optionValue(option)))
    : plan.spellOptions;
  const permanentLabel = isSpellbook ? 'Spellbook spells' : 'Known spells';
  const description = isSpellbook
    ? 'Choose the spells written in the Wizard spellbook, then choose the prepared list from those spellbook entries.'
    : plan.spellSelectionMode === 'prepared'
      ? 'Choose the character’s prepared spell list for this class and level.'
      : 'Choose the permanent known-spell list for this class and level.';

  return (
    <section className="full-creator-auto-box" aria-label="Higher-level spell choices">
      <strong>Higher-level spells</strong>
      <span>{description}</span>

      <ToggleChoiceList
        label="Cantrips"
        value={current.cantrips}
        options={plan.cantripOptions}
        max={cantripTarget}
        onChange={(cantrips) => update({ cantrips })}
      />

      <ToggleChoiceList
        label={permanentLabel}
        value={current.spells}
        options={plan.spellOptions}
        max={permanentTarget}
        onChange={(spells) => {
          const prepared = isSpellbook ? current.prepared.filter((name) => spells.includes(name)) : current.prepared;
          update({ spells, prepared });
        }}
      />

      <ToggleChoiceList
        label="Prepared spells"
        value={current.prepared}
        options={preparedOptions}
        max={preparedTarget}
        onChange={(prepared) => update({ prepared })}
      />

      {isSpellbook && permanentTarget > 0 && preparedTarget > 0 && current.spells.length < permanentTarget && (
        <small>Finish choosing the spellbook before the full prepared list will be available.</small>
      )}

      {arr(plan.arcanumLevels).length > 0 && (
        <small>Mystic Arcanum is tracked on save when matching high-level spell options are available in the spell database.</small>
      )}
    </section>
  );
}

export function WarlockChoiceSection({ plan, selection, onChange }) {
  if (!plan?.invocationsRequired && !plan?.pactBoonRequired) return null;
  const rawCurrent = normaliseWarlockSelection(selection, plan);
  const invocationOptions = arr(plan.invocationOptionDetails).length
    ? plan.invocationOptionDetails
    : arr(plan.eligibleInvocationOptions).length
      ? plan.eligibleInvocationOptions
      : plan.invocationOptions;
  const eligibleInvocationNames = new Set(arr(invocationOptions).map(optionValue));
  const current = {
    ...rawCurrent,
    pactBoon: plan.pactBoonRequired ? rawCurrent.pactBoon : '',
    invocations: arr(rawCurrent.invocations).filter((name) => eligibleInvocationNames.has(name)),
  };
  const update = (patch) => onChange({ ...current, ...patch });
  const count = Number(plan.invocationCount || 0);
  const is2024 = String(plan.edition || '').includes('2024');

  React.useEffect(() => {
    const changed = rawCurrent.pactBoon !== current.pactBoon
      || rawCurrent.invocations.length !== current.invocations.length
      || rawCurrent.invocations.some((name, index) => name !== current.invocations[index]);
    if (changed) onChange(current);
  }, [current, onChange, rawCurrent]);

  return (
    <section className="full-creator-auto-box" aria-label="Warlock choices">
      <strong>Warlock choices</strong>
      <span>{is2024
        ? 'Choose Eldritch Invocations available at this Warlock level. Pact of the Blade, Chain, and Tome are invocations in the 2024 rules.'
        : 'Pact Boon and Eldritch Invocations are applied to the saved sheet.'}</span>

      {plan.pactBoonRequired && (
        <ToggleChoiceList
          label="Pact Boon"
          value={current.pactBoon ? [current.pactBoon] : []}
          options={plan.pactBoonOptions}
          max={1}
          onChange={(boons) => update({ pactBoon: boons[0] || '' })}
        />
      )}

      <ToggleChoiceList
        label="Eldritch Invocations"
        value={current.invocations}
        options={invocationOptions}
        max={count}
        onChange={(invocations) => update({ invocations })}
      />
    </section>
  );
}
