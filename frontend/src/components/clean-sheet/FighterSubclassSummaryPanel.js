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
  if (!summary || (!summary.isChampion && !summary.isUnsupportedSubclass)) return null;

  const title = summary.isChampion ? 'Champion Features' : 'Fighter Subclass Support';

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-sheet-fighter-panel" data-testid="fighter-subclass-summary-panel">
      <div className="clean-sheet-fighter-heading">
        <div>
          <h2>{title}</h2>
          <p>Public-license subclass details are pulled from the shared Fighter rules helpers.</p>
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
      </div>
      <FeatureCards title="Active subclass features" features={summary.subclassFeatures || []} />
    </section>
  );
}
