import React, { useMemo } from 'react';

import { deriveCharacterSnapshot } from '@/data/deriveCharacterSnapshot';
import { featureTypeLabel, fmt } from './cleanSheetUtils';

function mergeFeatures(snapshotFeatures = [], legacyFeatures = []) {
  const seen = new Set();
  return [...snapshotFeatures, ...legacyFeatures]
    .filter(feature => feature?.name && !feature.isChoice)
    .filter(feature => {
      const key = `${String(feature.name).toLowerCase()}-${feature.level || ''}-${feature.source || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.level || 999) - Number(b.level || 999));
}

function groupFeatures(features = []) {
  const groups = {
    Action: [],
    'Bonus action': [],
    Reaction: [],
    Passive: [],
  };

  features.forEach(feature => {
    const label = featureTypeLabel(feature.type);
    if (label === 'Action' || label === 'Special' || label === 'Attack modifier') groups.Action.push(feature);
    else if (label === 'Bonus action') groups['Bonus action'].push(feature);
    else if (label === 'Reaction') groups.Reaction.push(feature);
    else groups.Passive.push(feature);
  });

  return groups;
}

export default function CleanSheetFeaturesTab({
  ac,
  actionEconomyGroups,
  character,
  classFeatureSummary,
  exhaustionLevel,
  proficiencyBonus,
  proficiencySummary,
  rulesEdition,
  speed,
  onOpenInventory,
}) {
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const canonicalFeatures = useMemo(
    () => mergeFeatures(snapshot.features, classFeatureSummary),
    [snapshot.features, classFeatureSummary],
  );
  const featureGroups = useMemo(
    () => groupFeatures(canonicalFeatures.length ? canonicalFeatures : Object.values(actionEconomyGroups || {}).flat()),
    [canonicalFeatures, actionEconomyGroups],
  );
  const resources = snapshot.resources || [];
  const warnings = snapshot.warnings || [];

  return (
    <div className="clean-sheet-grid clean-sheet-features-tab clean-sheet-class-tab">
      <section className="clean-sheet-panel clean-sheet-wide" data-testid="class-feature-action-economy">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Class</h2>
            <p>{rulesEdition} rules • {snapshot.identity.primaryClass || character.character_class || 'Class'} level {snapshot.identity.level || character.level || 1}</p>
          </div>
          <span>{canonicalFeatures.length} feature{canonicalFeatures.length === 1 ? '' : 's'}</span>
        </div>
        <div className="clean-sheet-feature-lanes">
          {Object.entries(featureGroups).map(([label, features]) => (
            <div key={label} className="clean-sheet-feature-lane">
              <h3>{label}</h3>
              {features.length ? features.map((feature) => (
                <article key={`${label}-${feature.name}-${feature.level || 'sheet'}-${feature.source || 'feature'}`} className="clean-sheet-feature-card">
                  <div>
                    <strong>{feature.name}</strong>
                    {feature.level && <span>Level {feature.level}</span>}
                  </div>
                  {feature.uses && <em>{feature.uses}</em>}
                  {feature.source && <em>{feature.source}</em>}
                  {feature.description && <p>{feature.description}</p>}
                </article>
              )) : (
                <p className="clean-sheet-feature-empty">No {label.toLowerCase()} class features found yet.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {!!resources.length && (
        <section className="clean-sheet-panel clean-sheet-wide" data-testid="class-resource-summary">
          <div className="clean-sheet-panel-heading">
            <div>
              <h2>Class Resources</h2>
              <p>Class abilities with uses, recovery rules, and rest tracking.</p>
            </div>
            <span>{resources.length} resource{resources.length === 1 ? '' : 's'}</span>
          </div>
          <div className="clean-sheet-readiness-grid">
            {resources.map(resource => (
              <div key={`${resource.className || 'class'}-${resource.key}`}>
                <span>{resource.className || 'Class'}</span>
                <strong>{resource.label}</strong>
                <em>{resource.current}/{resource.max} • restores on {String(resource.restore || 'long-rest').replace('-', ' ')}</em>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!warnings.length && (
        <section className="clean-sheet-panel clean-sheet-wide" data-testid="character-progression-warnings">
          <div className="clean-sheet-panel-heading">
            <div>
              <h2>Class Warnings</h2>
              <p>These are not blockers, but they flag class data that should be checked.</p>
            </div>
            <span>{warnings.length}</span>
          </div>
          <div className="clean-sheet-proficiency-lists">
            {warnings.map((warning, index) => (
              <div key={`${warning}-${index}`}>
                <h3>Check</h3>
                <p>{warning}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="clean-sheet-panel clean-sheet-wide" data-testid="proficiency-equipment-summary">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Class Readiness</h2>
            <p>Quick checks for armour, weapons, tools, languages, AC, speed, and proficiency.</p>
          </div>
          <button type="button" onClick={onOpenInventory}>Open inventory</button>
        </div>
        <div className="clean-sheet-readiness-grid">
          <div><span>Armour Class</span><strong>{ac}</strong><em>Derived from equipment and stats.</em></div>
          <div><span>Speed</span><strong>{speed}ft</strong><em>Check class, race/species, armour, and conditions.</em></div>
          <div><span>Exhaustion</span><strong>{exhaustionLevel}</strong><em>{exhaustionLevel ? 'Apply condition penalties at the table.' : 'No exhaustion marked.'}</em></div>
          <div><span>Proficiency</span><strong>{fmt(proficiencyBonus)}</strong><em>Total character level based.</em></div>
        </div>
        <div className="clean-sheet-proficiency-lists">
          {proficiencySummary.map(([label, items]) => (
            <div key={label}>
              <h3>{label}</h3>
              <p>{items.length ? items.slice(0, 10).join(', ') : 'None recorded yet'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
