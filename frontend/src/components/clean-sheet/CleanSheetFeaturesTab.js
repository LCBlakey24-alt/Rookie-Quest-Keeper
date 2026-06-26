import React from 'react';

import { fmt } from './cleanSheetUtils';

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
  return (
    <div className="clean-sheet-grid clean-sheet-features-tab">
      <section className="clean-sheet-panel clean-sheet-wide" data-testid="class-feature-action-economy">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Features</h2>
            <p>{rulesEdition} rules • {character.character_class || 'Class'} level {character.level || 1}</p>
          </div>
          <span>{classFeatureSummary.length} features</span>
        </div>
        <div className="clean-sheet-feature-lanes">
          {Object.entries(actionEconomyGroups).map(([label, features]) => (
            <div key={label} className="clean-sheet-feature-lane">
              <h3>{label}</h3>
              {features.length ? features.map((feature) => (
                <article key={`${label}-${feature.name}-${feature.level || 'sheet'}`} className="clean-sheet-feature-card">
                  <div>
                    <strong>{feature.name}</strong>
                    {feature.level && <span>Level {feature.level}</span>}
                  </div>
                  {feature.uses && <em>{feature.uses}</em>}
                  {feature.description && <p>{feature.description}</p>}
                </article>
              )) : (
                <p className="clean-sheet-feature-empty">No {label.toLowerCase()} features found yet.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide" data-testid="proficiency-equipment-summary">
        <div className="clean-sheet-panel-heading">
          <div>
            <h2>Readiness</h2>
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
