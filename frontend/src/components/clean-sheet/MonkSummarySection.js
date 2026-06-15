import React from 'react';
import { isMonkCharacter } from '@/data/monkCharacterShape';
import { getMonkSheetSummary } from '@/data/monkSheetSummary';

function FeatureList({ title, features }) {
  if (!features?.length) return null;
  return <div className="clean-sheet-maneuver-panel"><div className="clean-sheet-maneuver-header"><strong>{title}</strong><span>{features.length} item{features.length === 1 ? '' : 's'}</span></div><div className="clean-sheet-maneuver-grid">{features.map(feature => <div key={`${feature.level}-${feature.key || feature.name}`} className="clean-sheet-action-card"><span className="clean-sheet-action-type">Level {feature.level}</span><strong>{feature.name}</strong><span>{feature.summary || (feature.choiceType ? `Choice: ${feature.choiceType.replace(/_/g, ' ')}` : feature.type)}</span></div>)}</div></div>;
}

export default function MonkSummarySection({ character, resources = [], onSpendDiscipline }) {
  if (!isMonkCharacter(character)) return null;
  const summary = getMonkSheetSummary(character);
  const discipline = resources.find(resource => resource.key === 'ki');
  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-fighter-panel" data-testid="monk-summary-panel">
      <div className="clean-sheet-fighter-heading"><div><h2>Monk Discipline Engine</h2><p>Track Martial Arts, Ki/Discipline, unarmored defenses, mobility, reactions, stunning tools, and subclass unlocks.</p></div><span>Monk {summary.level}</span></div>
      <div className="clean-sheet-fighter-stat-grid">
        <div><span>{summary.resourceName}</span><strong>{summary.resourceUses}</strong><em>Restored on short rest from level 2 onward.</em></div>
        <div><span>Martial Arts Die</span><strong>{summary.martialArtsDie}</strong><em>Use with unarmed strikes and Monk weapons.</em></div>
        <div><span>Unarmored AC</span><strong>{summary.unarmoredDefenseAc}</strong><em>10 + Dex + Wis if not wearing armor or shield.</em></div>
        <div><span>Movement</span><strong>+{summary.unarmoredMovementBonus} ft</strong><em>Unarmored movement bonus.</em></div>
        <div><span>Reaction</span><strong>{summary.deflectFeature || 'None yet'}</strong><em>{summary.slowFall ? 'Slow Fall also online.' : 'Slow Fall unlocks at level 4.'}</em></div>
        <div><span>Subclass</span><strong>{summary.subclassLabel}</strong><em>{summary.subclassRole || `${summary.edition} rules.`}</em></div>
      </div>
      <div className="clean-sheet-fighter-buttons">
        <button type="button" onClick={() => onSpendDiscipline?.('flurry')} disabled={!discipline || discipline.current <= 0}>Flurry of Blows {discipline ? `${discipline.current}/${discipline.max}` : ''}</button>
        <button type="button" onClick={() => onSpendDiscipline?.('patient')} disabled={!discipline || discipline.current <= 0}>Patient Defense</button>
        <button type="button" onClick={() => onSpendDiscipline?.('step')} disabled={!discipline || discipline.current <= 0}>Step of the Wind</button>
      </div>
      {!summary.subclassSupportedInRuleset && <p className="clean-sheet-muted">This subclass is not normally available in the selected rules edition.</p>}
      <FeatureList title="Subclass online" features={summary.subclassFeatures} />
      <FeatureList title="Subclass coming next" features={summary.nextSubclassFeatures} />
      <FeatureList title="This level" features={summary.currentLevelFeatures} />
      <FeatureList title="Coming next" features={summary.nextFeatures} />
    </section>
  );
}
