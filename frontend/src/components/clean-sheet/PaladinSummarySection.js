import React from 'react';
import { isPaladinCharacter } from '@/data/paladinCharacterShape';
import { getPaladinSheetSummary } from '@/data/paladinSheetSummary';

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
            <span>{feature.summary || (feature.choiceType ? `Choice: ${feature.choiceType.replace(/_/g, ' ')}` : feature.type)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaladinSummarySection({ character, resources = [], onLayOnHands, onChannelDivinity }) {
  if (!isPaladinCharacter(character)) return null;

  const summary = getPaladinSheetSummary(character);
  const layOnHands = resources.find(resource => resource.key === 'lay_on_hands' && (!resource.className || resource.className === 'Paladin'))
    || resources.find(resource => resource.key === 'lay_on_hands');
  const channelDivinity = resources.find(resource => resource.key === 'channel_divinity' && (!resource.className || resource.className === 'Paladin'))
    || resources.find(resource => resource.key === 'channel_divinity');

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-fighter-panel" data-testid="paladin-summary-panel">
      <div className="clean-sheet-fighter-heading">
        <div>
          <h2>Paladin Oath Engine</h2>
          <p>Track Lay on Hands, Channel Divinity, Divine Smite, auras, prepared half-caster slots, oath features, and upcoming unlocks.</p>
        </div>
        <span>Paladin {summary.level}</span>
      </div>

      <div className="clean-sheet-fighter-stat-grid">
        <div><span>Lay on Hands</span><strong>{summary.layOnHandsPool}</strong><em>Healing pool per long rest.</em></div>
        <div><span>Channel Divinity</span><strong>{summary.channelDivinityUses}</strong><em>{summary.edition} rules.</em></div>
        <div><span>Highest slot</span><strong>{summary.highestSpellLevel ? `${summary.highestSpellLevel} level` : 'None'}</strong><em>Half-caster spell slots for smites and spells.</em></div>
        <div><span>Aura</span><strong>{summary.auraOfProtection ? `${summary.auraRange} ft` : 'None yet'}</strong><em>Aura of Protection starts at level 6.</em></div>
        <div><span>Attack routine</span><strong>{summary.extraAttack ? '2 attacks' : '1 attack'}</strong><em>{summary.improvedSmite ? 'Radiant Strikes online.' : 'Improved/Radiant Strikes at level 11.'}</em></div>
        <div><span>Oath</span><strong>{summary.subclassLabel}</strong><em>{summary.subclassRole || `${summary.edition} rules.`}</em></div>
      </div>

      <div className="clean-sheet-fighter-buttons">
        <button type="button" onClick={onLayOnHands} disabled={!layOnHands || layOnHands.current <= 0}>Lay on Hands {layOnHands ? `${layOnHands.current}/${layOnHands.max}` : ''}</button>
        <button type="button" onClick={onChannelDivinity} disabled={!channelDivinity || channelDivinity.current <= 0}>Channel Divinity {channelDivinity ? `${channelDivinity.current}/${channelDivinity.max}` : ''}</button>
      </div>

      {!summary.subclassSupportedInRuleset && <p className="clean-sheet-muted">This oath is not normally available in the selected rules edition.</p>}
      <FeatureList title="Oath online" features={summary.subclassFeatures} />
      <FeatureList title="Oath coming next" features={summary.nextSubclassFeatures} />
      <FeatureList title="This level" features={summary.currentLevelFeatures} />
      <FeatureList title="Coming next" features={summary.nextFeatures} />
    </section>
  );
}
