import React from 'react';
import { isBarbarianCharacter } from '@/data/barbarianCharacterShape';
import { getBarbarianSheetSummary } from '@/data/barbarianSheetSummary';

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

export default function BarbarianSummarySection({ character }) {
  if (!isBarbarianCharacter(character)) return null;
  const summary = getBarbarianSheetSummary(character);

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-fighter-panel" data-testid="barbarian-summary-panel">
      <div className="clean-sheet-fighter-heading">
        <div>
          <h2>Barbarian Rage Engine</h2>
          <p>Track Rage, Reckless Attack, defenses, Brutal Critical/Strike, and the next Primal Path unlocks.</p>
        </div>
        <span>Barbarian {summary.level}</span>
      </div>
      <div className="clean-sheet-fighter-stat-grid">
        <div><span>Rage uses</span><strong>{summary.rageUsesLabel}</strong><em>Restored on long rest.</em></div>
        <div><span>Rage damage</span><strong>+{summary.rageDamageBonus}</strong><em>Strength melee weapon damage while raging.</em></div>
        <div><span>Unarmored AC</span><strong>{summary.unarmoredDefenseAc}</strong><em>10 + Dex + Con if not wearing armor.</em></div>
        <div><span>Subclass</span><strong>{summary.subclassLabel}</strong><em>{summary.edition} rules.</em></div>
        <div><span>Brutal feature</span><strong>{summary.brutalCriticalLabel}</strong><em>Level 9+ damage spike.</em></div>
        <div><span>Attack routine</span><strong>{summary.extraAttack ? '2 attacks' : '1 attack'}</strong><em>{summary.recklessAttack ? 'Reckless Attack available.' : 'Reckless at level 2.'}</em></div>
      </div>
      <FeatureList title="This level" features={summary.currentLevelFeatures} />
      <FeatureList title="Coming next" features={summary.nextFeatures} />
    </section>
  );
}
