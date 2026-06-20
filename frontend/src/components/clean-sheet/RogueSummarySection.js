import React from 'react';
import { isRogueCharacter } from '@/data/rogueCharacterShape';
import { getRogueSheetSummary } from '@/data/rogueSheetSummary';

function FeatureList({ title, features }) {
  if (!features?.length) return null;
  return (
    <div className="clean-sheet-maneuver-panel">
      <div className="clean-sheet-maneuver-header"><strong>{title}</strong><span>{features.length} item{features.length === 1 ? '' : 's'}</span></div>
      <div className="clean-sheet-maneuver-grid">
        {features.map(feature => <div key={`${feature.level}-${feature.key || feature.name}`} className="clean-sheet-action-card"><span className="clean-sheet-action-type">Level {feature.level}</span><strong>{feature.name}</strong><span>{feature.summary || (feature.choiceType ? `Choice: ${feature.choiceType.replace(/_/g, ' ')}` : feature.type)}</span></div>)}
      </div>
    </div>
  );
}

export default function RogueSummarySection({ character }) {
  if (!isRogueCharacter(character)) return null;
  const summary = getRogueSheetSummary(character);
  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-fighter-panel" data-testid="rogue-summary-panel">
      <div className="clean-sheet-fighter-heading"><div><h2>Rogue Precision Engine</h2><p>Track Sneak Attack, Cunning Action, reactions, reliable skill play, subclass features, and upcoming Rogue unlocks.</p></div><span>Rogue {summary.level}</span></div>
      <div className="clean-sheet-fighter-stat-grid">
        <div><span>Sneak Attack</span><strong>{summary.sneakAttackLabel}</strong><em>{summary.sneakAttackReminder}</em></div>
        <div><span>Bonus action</span><strong>{summary.cunningAction ? 'Cunning Action' : 'None yet'}</strong><em>{summary.cunningActionOptions.join(', ') || 'Unlocks at level 2.'}</em></div>
        <div><span>Reaction</span><strong>{summary.uncannyDodge ? 'Uncanny Dodge' : 'Watch positioning'}</strong><em>{summary.uncannyDodge ? 'Reduce one hit against you.' : 'Unlocks at level 5.'}</em></div>
        <div><span>Defense</span><strong>{summary.evasion ? 'Evasion' : 'Mobile skirmisher'}</strong><em>{summary.evasion ? 'Dex save damage mitigation online.' : 'Evasion unlocks at level 7.'}</em></div>
        <div><span>Skills</span><strong>{summary.reliableTalent ? 'Reliable Talent' : 'Expertise'}</strong><em>{summary.reliableTalent ? 'Minimum d20 reliability on proficient checks.' : 'Expertise choices drive skill identity.'}</em></div>
        <div><span>Subclass</span><strong>{summary.subclassLabel}</strong><em>{summary.subclassRole || `${summary.edition} rules.`}</em></div>
      </div>
      {!summary.subclassSupportedInRuleset && <p className="clean-sheet-muted">This subclass is not normally available in the selected rules edition.</p>}
      <FeatureList title="Subclass online" features={summary.subclassFeatures} />
      <FeatureList title="Subclass coming next" features={summary.nextSubclassFeatures} />
      <FeatureList title="This level" features={summary.currentLevelFeatures} />
      <FeatureList title="Coming next" features={summary.nextFeatures} />
    </section>
  );
}
