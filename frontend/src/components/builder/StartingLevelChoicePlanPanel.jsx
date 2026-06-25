import React, { useMemo } from 'react';
import { ArrowUpCircle, CheckCircle2, Circle, Sparkles } from 'lucide-react';

import { getStartingLevelChoicePlan, getStartingLevelOptions } from '@/data/startingLevelChoices2014';

export default function StartingLevelChoicePlanPanel({
  className,
  startingLevel = 1,
  onStartingLevelChange,
  theme,
  inputStyle,
  labelStyle,
}) {
  const plan = useMemo(() => getStartingLevelChoicePlan(className, startingLevel), [className, startingLevel]);
  const levelOptions = useMemo(() => getStartingLevelOptions(), []);

  const panel = {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    border: `1px solid ${theme?.border || 'rgba(216, 173, 79, 0.26)'}`,
    background: 'rgba(8, 10, 24, 0.34)',
  };

  const chip = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 8px',
    borderRadius: 999,
    border: `1px solid ${theme?.border || 'rgba(216, 173, 79, 0.26)'}`,
    color: theme?.text?.secondary || '#e6d7bb',
    fontSize: 12,
    fontWeight: 800,
  };

  return (
    <section style={panel} data-testid="starting-level-choice-plan">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 130px', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={labelStyle || { display: 'block', marginBottom: 8 }}>Starting level</label>
          <p style={{ margin: 0, color: theme?.text?.secondary || '#e6d7bb', fontSize: 13, lineHeight: 1.45 }}>
            Pick the level this hero starts at. The builder will use this to collect earlier subclass, ASI/feat, spell, invocation, expertise, and other level-up choices before review.
          </p>
        </div>
        <select
          value={startingLevel}
          onChange={(event) => onStartingLevelChange?.(Number(event.target.value) || 1)}
          style={inputStyle || { width: '100%' }}
        >
          {levelOptions.map(level => <option key={level} value={level}>Level {level}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <span style={chip}><ArrowUpCircle size={14} /> {plan.startingLevel === 1 ? 'Normal level 1 start' : `Catch-up to level ${plan.startingLevel}`}</span>
        <span style={chip}><CheckCircle2 size={14} /> {plan.requiredCount} required</span>
        <span style={chip}><Circle size={14} /> {plan.optionalCount} optional</span>
      </div>

      <p style={{ margin: '10px 0 0', color: theme?.text?.secondary || '#e6d7bb', fontSize: 13, lineHeight: 1.45 }}>
        {plan.summary}
      </p>

      {plan.choices.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {plan.choices.slice(0, 8).map(choice => (
            <article key={choice.id} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 8, alignItems: 'start' }}>
              <Sparkles size={15} style={{ color: theme?.sunset?.gold || '#d8ad4f', marginTop: 2 }} />
              <div>
                <strong style={{ color: theme?.text?.primary || '#f6ead2', fontSize: 13 }}>Lv {choice.level}: {choice.title}</strong>
                <p style={{ margin: '2px 0 0', color: theme?.text?.secondary || '#e6d7bb', fontSize: 12, lineHeight: 1.4 }}>
                  {choice.description} {!choice.required && <em style={{ color: theme?.text?.muted || '#8686ac' }}>Optional</em>}
                </p>
              </div>
            </article>
          ))}
          {plan.choices.length > 8 && (
            <p style={{ margin: 0, color: theme?.text?.muted || '#8686ac', fontSize: 12 }}>
              +{plan.choices.length - 8} more choices will be shown in the catch-up choices step.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
