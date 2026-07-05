import React from 'react';

function FeatureCards({ title, features = [] }) {
  if (!features.length) return null;
  return (
    <div className="clean-sheet-maneuver-panel">
      <div className="clean-sheet-maneuver-header">
        <strong>{title}</strong>
        <span>{features.length} feature{features.length === 1 ? '' : 's'}</span>
      </div>
      <div className="clean-sheet-maneuver-grid">
        {features.map(feature => (
          <div key={`${feature.level}-${feature.key || feature.name}`} className="clean-sheet-action-card">
            <span className="clean-sheet-action-type">Level {feature.level}</span>
            <strong>{feature.name}</strong>
            <span>{feature.description || feature.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FighterSubclassSummaryPanel({ summary }) {
  if (!summary || (!summary.isChampion && !summary.isBattleMaster && !summary.isMagicSubclass && !summary.isSamurai && !summary.isUnsupportedSubclass)) return null;

  const title = summary.isChampion
    ? 'Champion Features'
    : summary.isBattleMaster
      ? 'Battle Master Features'
      : summary.isMagicSubclass
        ? 'Magic Fighter Features'
        : summary.isSamurai
          ? 'Samurai Features'
          : 'Fighter Subclass Support';

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-fighter-panel" data-testid="fighter-subclass-summary-panel">
      <div className="clean-sheet-fighter-heading">
        <div>
          <h2>{title}</h2>
          <p>Subclass details are pulled from the shared Fighter rules helpers.</p>
        </div>
        <span>{summary.edition} rules</span>
      </div>
      {summary.isUnsupportedSubclass && (
        <div className="clean-sheet-empty-state">
          <strong>{summary.unsupportedSubclassLabel || 'This Fighter subclass'}</strong>
          <p>This subclass is recorded on the character, but detailed sheet automation is still being wired. Core Fighter actions, resources, attacks, and level reminders still work.</p>
        </div>
      )}
      <div className="clean-sheet-fighter-stat-grid">
        {summary.isChampion && (
          <div><span>Critical range</span><strong>{summary.criticalRange?.label || '20'}</strong><em>Champion critical scaling.</em></div>
        )}
        {summary.isSamurai && summary.samurai && (
          <>
            <div><span>Fighting Spirit</span><strong>{summary.samurai.fightingSpiritUses}</strong><em>Long-rest uses tracked by Fighter level.</em></div>
            <div><span>Subclass features</span><strong>{summary.subclassFeatures?.length || 0}</strong><em>Active Samurai unlocks.</em></div>
          </>
        )}
        {summary.isBattleMaster && summary.battleMaster && (
          <>
            <div><span>Superiority dice</span><strong>{summary.battleMaster.superiorityDice}</strong><em>Uses available by Fighter level.</em></div>
            <div><span>Die size</span><strong>d{summary.battleMaster.superiorityDie}</strong><em>Battle Master die scaling.</em></div>
            <div><span>Maneuvers known</span><strong>{summary.battleMaster.maneuverCount}</strong><em>Expected maneuver count.</em></div>
          </>
        )}
        {summary.isMagicSubclass && summary.magicSubclass && (
          <>
            <div><span>1st level slots</span><strong>{summary.magicSubclass.spellSlots?.[0] || 0}</strong><em>Subclass spellcasting.</em></div>
            <div><span>2nd level slots</span><strong>{summary.magicSubclass.spellSlots?.[1] || 0}</strong><em>Subclass spellcasting.</em></div>
            <div><span>3rd level slots</span><strong>{summary.magicSubclass.spellSlots?.[2] || 0}</strong><em>Subclass spellcasting.</em></div>
          </>
        )}
      </div>
      <FeatureCards title="Active subclass features" features={summary.subclassFeatures || []} />
    </section>
  );
}
