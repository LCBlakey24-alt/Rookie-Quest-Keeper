import React from 'react';

import {
  ABILITY_OPTIONS,
  defaultAsiSelection,
  getFeatName,
  normaliseSpellSelection,
  normaliseWarlockSelection,
} from '@/data/startingLevelChoiceEngine';

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const selectValues = (event, max = Infinity) => Array.from(event.target.selectedOptions).map((option) => option.value).slice(0, max);

function toggleValue(list, value, max = Infinity) {
  const current = arr(list);
  if (current.includes(value)) return current.filter((item) => item !== value);
  if (current.length >= max) return current;
  return [...current, value];
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
            <span>+1 / +2 ability</span>
            <select value={current.abilityOne} onChange={(event) => update({ abilityOne: event.target.value })}>
              {ABILITY_OPTIONS.map(([ability, label]) => <option key={ability} value={ability}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Second +1</span>
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
  if (!plan?.hasKnownSpellPicker && !plan?.cantripTarget) return null;
  const current = normaliseSpellSelection(selection, plan);
  const update = (patch) => onChange({ ...current, ...patch });
  const cantripTarget = Number(plan.cantripTarget || 0);
  const spellTarget = Number(plan.knownTarget || 0);

  return (
    <section className="full-creator-auto-box" aria-label="Higher-level spell choices">
      <strong>Higher-level spells</strong>
      <span>Choose up to the expected known spell totals for this starting level. Any duplicates from the main builder are skipped when saving.</span>

      {cantripTarget > 0 && (
        <div>
          <p className="full-creator-swipe-hint">Cantrips {current.cantrips.length}/{cantripTarget}</p>
          <div className="full-creator-equipment-list">
            {arr(plan.cantripOptions).map((spell) => (
              <button
                type="button"
                key={spell.name}
                className={current.cantrips.includes(spell.name) ? 'active' : ''}
                onClick={() => update({ cantrips: toggleValue(current.cantrips, spell.name, cantripTarget) })}
              >
                {spell.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {spellTarget > 0 && (
        <label className="full-creator-wide-label">
          <span>Known spells {current.spells.length}/{spellTarget}</span>
          <select multiple size={Math.min(10, Math.max(4, arr(plan.spellOptions).length))} value={current.spells} onChange={(event) => update({ spells: selectValues(event, spellTarget) })}>
            {arr(plan.spellOptions).map((spell) => (
              <option key={`${spell.level}-${spell.name}`} value={spell.name}>Level {spell.level}: {spell.name}</option>
            ))}
          </select>
        </label>
      )}

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

      {count > 0 && (
        <label className="full-creator-wide-label">
          <span>Eldritch Invocations {current.invocations.length}/{count}</span>
          <select multiple size={8} value={current.invocations} onChange={(event) => update({ invocations: selectValues(event, count) })}>
            {arr(plan.invocationOptions).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}
