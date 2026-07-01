import React from 'react';

import { CLASS_FEATURES } from '@/data/classFeatures';
import { fmt } from './cleanCombatTabUtils';

export function AttackCard({ action, onAttack, onDamage, children, active }) {
  const isSave = Boolean(action.saveText);
  return (
    <div className={`clean-sheet-action-card-shell ${active ? 'active' : ''}`}>
      <article className="clean-sheet-action-card clean-sheet-attack-card">
        <div className="clean-sheet-attack-card-top">
          <span className="clean-sheet-action-type">{action.type || 'Action'}</span>
          <strong>{action.title}</strong>
          {action.details && <span className="clean-sheet-attack-details">{action.details}</span>}
        </div>
        <div className="clean-sheet-attack-stat-row">
          <button type="button" onClick={onAttack} className="clean-sheet-attack-stat-box clean-sheet-attack-roll-box"><span>{isSave ? 'Save DC' : 'To Hit'}</span><strong>{action.saveText || fmt(action.attackMod || 0)}</strong></button>
          <button type="button" onClick={onDamage} className="clean-sheet-attack-stat-box clean-sheet-damage-roll-box" disabled={!action.damage}><span>Damage</span><strong>{action.damageText || '—'}</strong></button>
          <div className="clean-sheet-attack-stat-box clean-sheet-attack-detail-box"><span>Details</span><strong>{action.damageType || action.conditionText || 'No extra effect'}</strong></div>
        </div>
      </article>
      {children}
    </div>
  );
}

export function SimpleActionCard({ title, description, type = 'Action', onClick, disabled = false }) {
  return (
    <div className="clean-sheet-action-card-shell">
      <button type="button" className="clean-sheet-action-card" onClick={onClick} disabled={disabled}>
        <span className="clean-sheet-action-type">{type}</span>
        <strong>{title}</strong>
        <span>{description}</span>
      </button>
    </div>
  );
}

function FeatureList({ title, features }) {
  if (!features?.length) return null;
  return (
    <div className="clean-sheet-maneuver-panel">
      <div className="clean-sheet-maneuver-header">
        <strong>{title}</strong>
        <span>{features.length} item{features.length === 1 ? '' : 's'}</span>
      </div>
      <div className="clean-sheet-maneuver-grid">
        {features.map(feature => (
          <div key={`${feature.level}-${feature.key || feature.name}`} className="clean-sheet-action-card">
            <span className="clean-sheet-action-type">Level {feature.level}</span>
            <strong>{feature.name}</strong>
            <span>{feature.choiceType ? `Choice: ${feature.choiceType.replace(/_/g, ' ')}` : feature.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FighterFocusPanel({ fighterLevel, fighterSubclass, fighterPlan, maneuvers, resources, onSecondWind, onActionSurge, onIndomitable, onManeuver }) {
  if (!fighterLevel) return null;
  const actionSurge = resources.find(resource => resource.key === 'action_surge');
  const secondWind = resources.find(resource => resource.key === 'second_wind');
  const indomitable = resources.find(resource => resource.key === 'indomitable');
  const superiority = resources.find(resource => resource.key === 'superiority_dice');
  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-fighter-panel" data-testid="fighter-focus-panel">
      <div className="clean-sheet-fighter-heading">
        <div>
          <h2>Fighter Command</h2>
          <p>Track your core fighter loop: attacks, Action Surge, Second Wind, Indomitable, fighting style, and subclass tools.</p>
        </div>
        <span>Fighter {fighterLevel}</span>
      </div>
      <div className="clean-sheet-fighter-stat-grid">
        <div><span>Attacks/action</span><strong>{fighterPlan.attacksPerAction}</strong><em>Extra Attack included.</em></div>
        <div><span>Critical range</span><strong>{fighterPlan.criticalRange === 20 ? '20' : `${fighterPlan.criticalRange}–20`}</strong><em>{fighterSubclass === 'champion' ? 'Champion improved criticals.' : 'Standard critical range.'}</em></div>
        <div><span>Fighting style</span><strong>{fighterPlan.fightingStyle || 'Pick/record'}</strong><em>Shown from the sheet if saved.</em></div>
        <div><span>Subclass</span><strong>{fighterPlan.subclassLabel}</strong><em>{fighterPlan.rulesEdition} rules.</em></div>
        <div><span>Action Surge uses</span><strong>{fighterPlan.actionSurgeUses}</strong><em>From Fighter progression.</em></div>
        <div><span>Indomitable uses</span><strong>{fighterPlan.indomitableUses}</strong><em>From Fighter progression.</em></div>
      </div>
      <FeatureList title="This level" features={fighterPlan.currentLevelFeatures} />
      <FeatureList title="Coming next" features={fighterPlan.nextFeatures} />
      <div className="clean-sheet-fighter-buttons">
        <button type="button" onClick={onSecondWind} disabled={!secondWind || secondWind.current <= 0}>Second Wind {secondWind ? `${secondWind.current}/${secondWind.max}` : ''}</button>
        <button type="button" onClick={onActionSurge} disabled={!actionSurge || actionSurge.current <= 0}>Action Surge {actionSurge ? `${actionSurge.current}/${actionSurge.max}` : ''}</button>
        <button type="button" onClick={onIndomitable} disabled={!indomitable || indomitable.current <= 0}>Indomitable {indomitable ? `${indomitable.current}/${indomitable.max}` : ''}</button>
      </div>
      {fighterSubclass === 'battle_master' && (
        <div className="clean-sheet-maneuver-panel">
          <div className="clean-sheet-maneuver-header">
            <strong>Battle Master Maneuvers</strong>
            <span>{superiority ? `${superiority.current}/${superiority.max}` : 'No'} superiority dice • d{fighterPlan.superiorityDie}</span>
          </div>
          <div className="clean-sheet-maneuver-grid">
            {(maneuvers.length ? maneuvers : (CLASS_FEATURES.fighter?.subclasses?.battle_master?.maneuvers || []).slice(0, 6)).map((maneuver) => {
              const name = typeof maneuver === 'string' ? maneuver : maneuver.name;
              const description = typeof maneuver === 'string'
                ? (CLASS_FEATURES.fighter?.subclasses?.battle_master?.maneuvers || []).find(item => item.name === maneuver)?.description || 'Spend a superiority die when the maneuver applies.'
                : maneuver.description;
              return (
                <button key={name} type="button" onClick={() => onManeuver(name)} disabled={!superiority || superiority.current <= 0}>
                  <strong>{name}</strong>
                  <span>{description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function ActionSection({ title, children }) {
  return (
    <section className="clean-sheet-panel clean-sheet-wide">
      <h2>{title}</h2>
      <div className="clean-sheet-action-grid">{children}</div>
    </section>
  );
}
