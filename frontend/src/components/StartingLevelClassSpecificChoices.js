import React from 'react';

import { normaliseClassSpecificSelection } from '@/data/classSpecificChoiceEngine';

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const selectValues = (event, max = Infinity) => Array.from(event.target.selectedOptions).map((option) => option.value).slice(0, max);

function MultiSelectField({ label, value, options, target, onChange }) {
  if (!target) return null;
  return (
    <label className="full-creator-wide-label">
      <span>{label} {arr(value).length}/{target}</span>
      <select multiple size={Math.min(8, Math.max(4, arr(options).length))} value={arr(value)} onChange={(event) => onChange(selectValues(event, target))}>
        {arr(options).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
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
